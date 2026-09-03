from app.brain.bkt import classify_mastery, update_p_know


def test_correct_raises_p_know():
    result = update_p_know(0.3, 0.4, 0.2, 0.1, correct=True)
    assert result > 0.3


def test_incorrect_lowers_p_know():
    result = update_p_know(0.7, 0.4, 0.2, 0.1, correct=False)
    assert result < 0.7


def test_p_know_stays_in_open_unit_interval():
    for correct in (True, False):
        value = update_p_know(0.5, 0.4, 0.2, 0.1, correct=correct)
        assert 0 < value < 1


def test_repeated_correct_converges():
    p = 0.3
    for _ in range(20):
        p = update_p_know(p, 0.4, 0.2, 0.1, correct=True)
    assert p > 0.9


def test_classify_mastery_bands():
    assert classify_mastery(0.8) == "strong"
    assert classify_mastery(0.6) == "developing"
    assert classify_mastery(0.3) == "weak"


def test_clamp_extreme_incorrect():
    result = update_p_know(0.01, 0.01, 0.01, 0.99, correct=False)
    assert result > 0
    assert result < 1
