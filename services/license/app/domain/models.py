import enum

class LicenseStatus(str, enum.Enum):
    NOT_ACTIVATED = "NOT_ACTIVATED"
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    BANNED = "BANNED"

class PaymentMethod(str, enum.Enum):
    STARS = "Stars"
    FUNPAY = "FunPay"
    CRYPTO = "Crypto"
    PAYPAL = "PayPal"
    CARD = "Card"
    STEAM = "Steam"
    GIFT = "Gift"
    PROMO = "Promo"
