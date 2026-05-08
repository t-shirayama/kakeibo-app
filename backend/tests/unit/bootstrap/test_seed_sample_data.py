from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.bootstrap.seed_sample_data import SAMPLE_EMAIL, SAMPLE_USER_ID, seed_sample_data
from app.infrastructure.models import CategoryModel, TransactionModel, UploadModel, UserModel, UserSettingModel


def test_seed_sample_data_inserts_local_verification_dataset(db_session: Session) -> None:
    assert seed_sample_data(db_session) is True

    sample_user = db_session.scalar(select(UserModel).where(UserModel.email == SAMPLE_EMAIL))
    assert sample_user is not None
    assert sample_user.id == SAMPLE_USER_ID
    assert sample_user.is_admin is True

    assert db_session.scalar(select(func.count()).select_from(CategoryModel)) == 8
    assert db_session.scalar(select(func.count()).select_from(UploadModel)) == 3
    assert db_session.scalar(select(func.count()).select_from(TransactionModel)) == 68

    settings = db_session.get(UserSettingModel, SAMPLE_USER_ID)
    assert settings is not None
    assert settings.page_size == 10

    food_category = db_session.scalar(select(CategoryModel).where(CategoryModel.name == "食費"))
    assert food_category is not None
    assert food_category.monthly_budget == 45000


def test_seed_sample_data_is_skipped_without_reset_when_sample_user_exists(db_session: Session) -> None:
    assert seed_sample_data(db_session) is True

    assert seed_sample_data(db_session) is False

    assert db_session.scalar(select(func.count()).select_from(UserModel)) == 1
    assert db_session.scalar(select(func.count()).select_from(TransactionModel)) == 68


def test_seed_sample_data_reset_recreates_known_sample_data(db_session: Session) -> None:
    seed_sample_data(db_session)
    db_session.execute(TransactionModel.__table__.delete())

    assert seed_sample_data(db_session, reset=True) is True

    assert db_session.scalar(select(func.count()).select_from(UserModel)) == 1
    assert db_session.scalar(select(func.count()).select_from(TransactionModel)) == 68
