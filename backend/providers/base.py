from abc import ABC, abstractmethod
from typing import Any


class BankProvider(ABC):
    """
    Abstract base class that defines the contract for all bank providers.
    All providers (Plaid, Nordigen, etc.) must implement these methods.
    """

    @abstractmethod
    def create_link(self, user_id: str) -> dict[str, Any]:
        """
        Create a link token for connecting a bank account.
        Returns a dict with link token info for the frontend.
        """
        raise NotImplementedError

    @abstractmethod
    def exchange_token(self, user_id: str, public_token: str) -> dict[str, Any]:
        """
        Exchange public token for access token after user completes link flow.
        Returns connection status and item info.
        """
        raise NotImplementedError

    @abstractmethod
    def get_accounts(self, user_id: str) -> dict[str, Any]:
        """
        Get all accounts for a connected user.
        Returns account details (name, type, balance, etc.)
        """
        raise NotImplementedError

    @abstractmethod
    def get_transactions(self, user_id: str) -> dict[str, Any]:
        """
        Get transactions for a connected user.
        Returns list of transactions with amount, date, category, etc.
        """
        raise NotImplementedError

    @abstractmethod
    def get_insights(self, user_id: str) -> dict[str, Any]:
        """
        Get spending insights aggregated by category and day.
        Returns data formatted for charts.
        """
        raise NotImplementedError

    @abstractmethod
    def get_normalized_transactions(self, user_id: str) -> list[dict[str, Any]]:
        """
        Return transactions in the unified normalized format shared across
        all providers. Each item in the returned list must be:

        {
            "transaction_id": str,
            "amount":         float,        # positive = expense/debit
            "date":           str,           # "YYYY-MM-DD"
            "description":    str,
            "category":       str,           # fallback to "Other"
            "provider":       str,           # "plaid" | "nordigen"
            "currency":       str,           # ISO 4217, e.g. "USD"
        }

        Credits / refunds (amount <= 0) must be excluded so analytics
        always reflect outgoing spend only.
        """
        raise NotImplementedError
