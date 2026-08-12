import secrets
import string
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import BackgroundTasks

from app.shared.database import AsyncSessionLocal
from app.shared.datetime_utils import format_utc
from app.domain.models import LicenseStatus, License
from app.domain.schemas import GeneratePurchaseDTO, ActivateKeyDTO, UpdateLicenseDTO
from app.infrastructure.repository import LicenseRepository, TransactionRepository, LicenseModel, TransactionModel
from app.shared.exceptions import DomainException
from app.infrastructure.external_clients import UserServiceClient

class LicenseService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.license_repo = LicenseRepository(db)
        self.tx_repo = TransactionRepository(db)

    async def check_access(self, key: str, device: str, ip_address: str, user_agent: str) -> dict:
        db_sub = await self.license_repo.get_by_key(key)
        if not db_sub:
            raise DomainException(message="Key is invalid or expired", status_code=403, error_code="ACCESS_DENIED")
        
        domain_sub = License(
            id=db_sub.id, key=db_sub.key, duration_days=db_sub.duration_days,
            status=db_sub.status, activated_at=db_sub.activated_at, expires_at=db_sub.expires_at
        )
        
        if not domain_sub.is_valid():
            raise DomainException(message="Key is invalid or expired", status_code=403, error_code="ACCESS_DENIED")

        existing_devices = [d.device for d in db_sub.devices]
        if device not in existing_devices:
            if len(existing_devices) >= db_sub.max_devices: 
                raise DomainException(
                    message=f"Device limit reached (Max {db_sub.max_devices}). Reset HWID in profile.", 
                    status_code=403, error_code="HWID_LIMIT_REACHED"
                )

        await self.license_repo.log_device(db_sub.id, device, ip_address, user_agent)
        return {"user_id": db_sub.user_id, "expires_at": format_utc(db_sub.expires_at)}

    async def get_license_info(self, user_id: int) -> dict:
        db_sub = await self.license_repo.get_active_by_user(user_id)
        
        if not db_sub:
            raise DomainException(
                message="You don't have an active license.", 
                status_code=404, 
                error_code="NO_ACTIVE_LICENSE"
            )

        devices_list = []
        for d in db_sub.devices:
            hwid_masked = f"{d.device[:3]}******{d.device[-3:]}" if len(d.device) > 6 else "***"
            ip_masked = "Unknown"
            if d.ip_address:
                parts = d.ip_address.split('.')
                ip_masked = f"{parts[0]}.{parts[1]}.*.*" if len(parts) == 4 else "***"

            devices_list.append({
                "id": d.id,
                "hwid": hwid_masked,
                "ip": ip_masked,
                "last_used_at": format_utc(d.last_used_at)
            })

        tx = db_sub.transaction
        
        return {
            "license": {
                "id": db_sub.id,
                "user_id": db_sub.user_id,
                "key": db_sub.key,
                "status": db_sub.status.value,
                "duration_days": db_sub.duration_days,
                "max_devices": db_sub.max_devices,
                "reset_limit": db_sub.reset_limit,
                "activated_at": format_utc(db_sub.activated_at),
                "expires_at": format_utc(db_sub.expires_at),
            },
            "devices": devices_list,
            "transaction": {
                "amount": tx.amount,
                "method": tx.payment_method,
                "status": tx.status,
                "purchased_at": format_utc(tx.purchased_at)
            } if tx else None
        }

    async def reset_device(self, user_id: int, device_id: int):
        db_sub = await self.license_repo.get_active_by_user(user_id)
        if not db_sub:
            raise DomainException(message="No active license found.", status_code=404, error_code="NOT_FOUND")
            
        if db_sub.reset_limit <= 0: 
            raise DomainException(message="You have no device resets left.", status_code=403, error_code="RESET_LIMIT_REACHED")

        if not any(d.id == device_id for d in db_sub.devices):
            raise DomainException(message="Device not found on your license.", status_code=404, error_code="NOT_FOUND")
            
        deleted = await self.license_repo.remove_device(device_id)

        if deleted:
            db_sub.reset_limit -= 1
            await self.db.commit()
            return {"status": "success", "message": "Device has been successfully unlinked."}
        else:
            raise DomainException(message="Device delete is fail.", status_code=404, error_code="DELETE_FAILED")

    async def get_bot_info_by_social(self, telegram_id: int = None, discord_id: int = None) -> dict:
        user_client = UserServiceClient()
        user_id = await user_client.resolve_social_to_user_id(telegram_id, discord_id)
        if not user_id:
            return {"is_vip": False}
            
        license_obj = await self.license_repo.get_active_by_user(user_id)
        if not license_obj:
            return {"is_vip": False}
            
        transaction = license_obj.transaction
        return {
            "is_vip": True,
            "license": {
                "id": license_obj.id,
                "activated_at": format_utc(license_obj.activated_at),
                "expires_at": format_utc(license_obj.expires_at),
                "duration_days": license_obj.duration_days,
                "purchase_method": transaction.payment_method if transaction else None,
                "purchase_price": transaction.amount if transaction else None
            }
        }

    async def remove_device_admin(self, device_id: int):
        deleted = await self.license_repo.remove_device(device_id)
        if not deleted:
            raise DomainException(
                message=f"Device with ID {device_id} not found.", 
                status_code=404, 
                error_code="NOT_FOUND"
            )
        return {"status": "success"}

    def _make_key(self, n=16) -> str:
        raw = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(n))
        return '-'.join(raw[i:i+4] for i in range(0, n, 4))
    
    async def generate_and_bill(self, payload: GeneratePurchaseDTO):
        keys = [self._make_key() for _ in range(payload.count)]
        
        licenses_to_insert = [
            LicenseModel(
                key=k,
                duration_days=payload.duration_days,
                status=LicenseStatus.NOT_ACTIVATED,
                max_devices=payload.max_devices
            ) for k in keys
        ]
        
        inserted_licenses = await self.license_repo.create_licenses_bulk(licenses_to_insert)
        
        txs_to_insert = [
            TransactionModel(
                license_id=lic.id,
                amount=payload.amount,
                payment_method=payload.method.value,
                status=payload.status
            ) for lic in inserted_licenses
        ]
        
        inserted_txs = await self.tx_repo.create_transactions_bulk(txs_to_insert)
        
        await self.db.commit()
        
        if payload.count == 1:
            return {"key": keys[0], "transaction_id": inserted_txs[0].id}
            
        return keys

    async def activate_key_for_user(self, payload: ActivateKeyDTO, user_id: int) -> int:
        db_sub = await self.license_repo.get_by_key(payload.key)
        if not db_sub or db_sub.status != LicenseStatus.NOT_ACTIVATED:
            raise DomainException(message="Invalid key or already activated", status_code=400, error_code="INVALID_KEY")

        active_sub = await self.license_repo.get_active_by_user(user_id)
        if active_sub:
            if not payload.force:
                raise DomainException(
                    message="You already have an active license. Activating this key will deactivate the old one.", 
                    status_code=409, error_code="ACTIVE_LICENSE_EXISTS"
                )
            else:
                active_sub.status = LicenseStatus.EXPIRED
                active_sub.expires_at = datetime.now(timezone.utc)
        
        expires_at = None
        if db_sub.duration_days is not None:
            expires_at = datetime.now(timezone.utc) + timedelta(days=db_sub.duration_days)
        
        db_sub.user_id = user_id
        db_sub.status = LicenseStatus.ACTIVE
        db_sub.activated_at = datetime.now(timezone.utc)
        db_sub.expires_at = expires_at
        
        await self.db.commit()
        return db_sub.id

    async def complete_purchase(self, license_id: int, user_id: int):
        tx = await self.tx_repo.get_by_license(license_id)
        if tx:
            tx.status = "COMPLETED"
            tx.user_id = user_id
            tx.purchased_at = datetime.now(timezone.utc)
            await self.db.commit()

    async def get_active_license(self, user_id: int) -> LicenseModel:
        db_sub = await self.license_repo.get_active_by_user(user_id)
        if not db_sub:
            raise DomainException(message="You don't have an active license.", status_code=403, error_code="NO_ACTIVE_LICENSE")
        return db_sub

    async def admin_get_license(self, license_id: int) -> dict:
        license_obj = await self.license_repo.get_by_id(license_id)
        if not license_obj:
            raise DomainException(message="License not found", status_code=404, error_code="NOT_FOUND")
        return license_obj

    async def admin_find_licenses(self, user_id: int = None, key: str = None) -> list:
        if not user_id and not key:
            return []
        
        licenses = await self.license_repo.search_licenses(user_id=user_id, key=key)
        
        return [
            {
                "id": lic.id,
                "user_id": lic.user_id,
                "key": lic.key,
                "status": lic.status.value,
                "duration_days": lic.duration_days,
                "max_devices": lic.max_devices,
                "reset_limit": lic.reset_limit,
                "created_at": format_utc(lic.created_at),
                "activated_at": format_utc(lic.activated_at),
                "expires_at": format_utc(lic.expires_at),
                "transaction": {
                    "id": lic.transaction.id,
                    "amount": lic.transaction.amount,
                    "method": lic.transaction.payment_method,
                    "status": lic.transaction.status,
                    "purchased_at": format_utc(lic.transaction.purchased_at)
                } if lic.transaction else None
            }
            for lic in licenses
        ]

    async def admin_update_license(self, license_id: int, payload: UpdateLicenseDTO) -> dict:
        license_obj = await self.license_repo.get_by_id(license_id)
        if not license_obj:
            raise DomainException(message="License not found", status_code=404, error_code="NOT_FOUND")

        update_data = payload.model_dump(exclude_unset=True)
        if "status" in update_data:
            license_obj.status = update_data["status"]
        if "reset_limit" in update_data:
            license_obj.reset_limit = update_data["reset_limit"]
        if "max_devices" in update_data:
            license_obj.max_devices = update_data["max_devices"]
            
        await self.db.commit()
        await self.db.refresh(license_obj)
        return license_obj

class LicenseStatsService:
    _cached_stats = None
    _cache_expires_at = None
    _is_generating = False

    def __init__(self, db):
        self.repo = LicenseRepository(db)

    async def get_website_stats(self, background_tasks: BackgroundTasks = None):
        now = datetime.now(timezone.utc)

        if LicenseStatsService._cached_stats and LicenseStatsService._cache_expires_at and now < LicenseStatsService._cache_expires_at:
            return LicenseStatsService._cached_stats

        if LicenseStatsService._cached_stats is not None:
            if not LicenseStatsService._is_generating and background_tasks is not None:
                LicenseStatsService._is_generating = True
                background_tasks.add_task(LicenseStatsService._generate_background_stats)
            return LicenseStatsService._cached_stats

        LicenseStatsService._is_generating = True
        try:
            stats = await self.repo.get_heavy_public_stats()
            LicenseStatsService._cached_stats = stats
            LicenseStatsService._cache_expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
        finally:
            LicenseStatsService._is_generating = False

        return LicenseStatsService._cached_stats

    @staticmethod
    async def _generate_background_stats():
        try:
            async with AsyncSessionLocal() as db_session:
                repo = LicenseRepository(db_session)
                stats = await repo.get_heavy_public_stats()
                
                LicenseStatsService._cached_stats = stats
                LicenseStatsService._cache_expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
                print("VIP background stats generation completed.")
        except Exception as e:
            print(f"Error in VIP background stats generation: {e}")
        finally:
            LicenseStatsService._is_generating = False
