DEMO_TRANSIT_OVERRIDE: dict = {}


def update_p_know(
    p_know: float,
    p_transit: float,
    p_guess: float,
    p_slip: float,
    correct: bool,
) -> float:
    if correct:
        p_know_given_obs = (p_know * (1 - p_slip)) / (
            p_know * (1 - p_slip) + (1 - p_know) * p_guess
        )
    else:
        p_know_given_obs = (p_know * p_slip) / (
            p_know * p_slip + (1 - p_know) * (1 - p_guess)
        )
    p_know_new = p_know_given_obs + (1 - p_know_given_obs) * p_transit
    return max(0.0001, min(0.9999, p_know_new))


def classify_mastery(p_know: float) -> str:
    if p_know >= 0.7:
        return "strong"
    if 0.5 <= p_know < 0.7:
        return "developing"
    return "weak"
