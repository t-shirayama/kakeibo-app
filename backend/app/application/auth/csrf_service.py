from secrets import token_urlsafe


class CsrfTokenService:
    def issue_token(self) -> str:
        return token_urlsafe(32)

