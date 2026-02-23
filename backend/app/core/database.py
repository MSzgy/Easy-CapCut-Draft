import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

# SQLite 需要特殊的引擎参数
_is_sqlite = settings.DATABASE_URL.startswith("sqlite")

# 如果使用 SQLite，确保数据目录存在
if _is_sqlite:
    db_path = settings.DATABASE_URL.split("///")[-1]
    os.makedirs(os.path.dirname(db_path) or ".", exist_ok=True)

# 创建异步引擎
_engine_kwargs: dict = {
    "echo": settings.DEBUG,
    "pool_pre_ping": True,
}

if _is_sqlite:
    # SQLite 不支持 pool_size / max_overflow，使用 StaticPool 保持连接
    from sqlalchemy.pool import StaticPool
    _engine_kwargs.update({
        "connect_args": {"check_same_thread": False},
        "poolclass": StaticPool,
    })
else:
    _engine_kwargs.update({
        "pool_size": settings.DATABASE_POOL_SIZE,
        "max_overflow": settings.DATABASE_MAX_OVERFLOW,
    })

engine = create_async_engine(settings.DATABASE_URL, **_engine_kwargs)

# 创建会话工厂
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# 创建基类
Base = declarative_base()


async def get_db() -> AsyncSession:
    """获取数据库会话"""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """初始化数据库（创建表）"""
    # 需要先导入所有模型，确保 Base.metadata 包含所有表
    import app.models.models  # noqa: F401
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 种子管理员账户
    await seed_admin()


async def seed_admin():
    """如果管理员账户不存在，则自动创建"""
    from app.models.models import User, UserRole
    from app.core.auth import hash_password
    import uuid

    async with async_session_maker() as session:
        try:
            from sqlalchemy import select
            result = await session.execute(
                select(User).where(User.email == settings.ADMIN_EMAIL)
            )
            if result.scalar_one_or_none() is None:
                admin = User(
                    id=str(uuid.uuid4()),
                    email=settings.ADMIN_EMAIL,
                    username="admin",
                    hashed_password=hash_password(settings.ADMIN_PASSWORD),
                    role=UserRole.ADMIN,
                )
                session.add(admin)
                await session.commit()
                print(f"✅ 管理员账户已创建: {settings.ADMIN_EMAIL}")
            else:
                print(f"ℹ️  管理员账户已存在: {settings.ADMIN_EMAIL}")
        except Exception as e:
            await session.rollback()
            print(f"⚠️  管理员账户创建失败: {e}")


async def close_db():
    """关闭数据库连接"""
    await engine.dispose()
