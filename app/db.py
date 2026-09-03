from contextlib import contextmanager
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    UniqueConstraint,
    create_engine,
    event,
)
from sqlalchemy.orm import declarative_base, sessionmaker

engine = create_engine("sqlite:///./app.db", connect_args={"check_same_thread": False})


@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def _utcnow():
    return datetime.now(timezone.utc)


class Student(Base):
    __tablename__ = "students"
    student_id = Column(String, primary_key=True)
    created_at = Column(DateTime, default=_utcnow)


class Lesson(Base):
    __tablename__ = "lessons"
    lesson_id = Column(String, primary_key=True)
    student_id = Column(String, index=True)
    topic = Column(String)
    learner_level = Column(String, default="beginner")
    language = Column(String, default="English")
    teaching_style = Column(String, default="Direct")
    created_at = Column(DateTime, default=_utcnow)


class Concept(Base):
    __tablename__ = "concepts"
    concept_id = Column(String, primary_key=True)
    lesson_id = Column(String, index=True)
    name = Column(String)
    prerequisite_ids_json = Column(Text, default="[]")
    target_depth = Column(String, default="beginner")
    estimated_minutes = Column(Integer, default=10)


class MasteryState(Base):
    __tablename__ = "mastery_state"
    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String, index=True)
    concept_id = Column(String, index=True)
    p_know = Column(Float, default=0.3)
    p_transit = Column(Float, default=0.4)
    p_guess = Column(Float, default=0.2)
    p_slip = Column(Float, default=0.1)
    set_by_diagnostic = Column(Boolean, default=False)
    last_updated_turn = Column(String, nullable=True)
    __table_args__ = (UniqueConstraint("student_id", "concept_id"),)


class Misconception(Base):
    __tablename__ = "misconceptions"
    misconception_id = Column(String, primary_key=True)
    concept_id = Column(String, index=True)
    wrong_answer_pattern = Column(String)
    description = Column(Text)
    embedding_stored = Column(Boolean, default=False)


class VideoCache(Base):
    __tablename__ = "video_cache"
    id = Column(Integer, primary_key=True, autoincrement=True)
    cache_key = Column(String, unique=True)
    video_url = Column(String, nullable=True)
    audio_url = Column(String, nullable=True)
    subtitle_text = Column(Text, nullable=True)
    render_tier = Column(String, default="prerendered")
    created_at = Column(DateTime, default=_utcnow)


class LearningPathModel(Base):
    __tablename__ = "learning_paths"
    path_id = Column(String, primary_key=True)
    student_id = Column(String, index=True)
    root_topic = Column(String)
    plan_json = Column(Text, default="{}")
    current_position_index = Column(Integer, default=0)


class StudentProfileModel(Base):
    __tablename__ = "student_profile"
    student_id = Column(String, primary_key=True)
    lessons_completed_json = Column(Text, default="[]")
    aggregate_mastery_json = Column(Text, default="{}")
    overall_weak_json = Column(Text, default="[]")
    overall_strong_json = Column(Text, default="[]")
    active_learning_path_id = Column(String, nullable=True)


class LessonSessionModel(Base):
    __tablename__ = "lesson_sessions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String, index=True)
    lesson_id = Column(String, index=True)
    current_concept_id = Column(String, nullable=True)
    current_stage = Column(String, default="understand")
    current_turn_id = Column(String, nullable=True)
    turns_json = Column(Text, default="[]")
    document_id = Column(String, nullable=True)
    last_turn_at = Column(String, nullable=True)


class Flashcard(Base):
    __tablename__ = "flashcards"
    flashcard_id = Column(String, primary_key=True)
    student_id = Column(String, index=True)
    lesson_id = Column(String, index=True)
    concept_id = Column(String)
    front = Column(Text)
    back = Column(Text)
    created_at = Column(DateTime, default=_utcnow)


Base.metadata.create_all(engine)


@contextmanager
def get_db():
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
