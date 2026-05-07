from __future__ import annotations

from app.application.auth.ports import PasswordHasherPort, UserRecord
from app.application.user_data.ports import UserDataRepositoryProtocol, UploadStorageProtocol


class UserDataDeletionError(ValueError):
    pass


class UserDataDeletionUseCases:
    def __init__(
        self,
        *,
        repository: UserDataRepositoryProtocol,
        storage: UploadStorageProtocol,
        password_hasher: PasswordHasherPort,
    ) -> None:
        self._repository = repository
        self._storage = storage
        self._password_hasher = password_hasher

    def delete_all_user_data(
        self,
        *,
        current_user: UserRecord,
        confirmation_text: str | None,
        password: str | None,
    ) -> None:
        # 破壊的操作は確認文字列または現在パスワードのどちらかを必須にする。
        if confirmation_text != "DELETE" and not (
            password and self._password_hasher.verify(password, current_user.password_hash)
        ):
            raise UserDataDeletionError("Confirmation text must be DELETE or password must be valid.")

        # DBの論理削除後、保存済みPDF原本もストレージから削除する。
        upload_paths = self._repository.list_active_upload_paths(user_id=current_user.id)
        self._repository.soft_delete_user_data(user_id=current_user.id)
        for path in upload_paths:
            self._storage.delete(path)
