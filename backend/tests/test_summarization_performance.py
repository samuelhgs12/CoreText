import logging

from app.services.summarization import PERFORMANCE_TARGET_MS, _warn_if_slow


def test_warn_if_slow_logs_warning_when_over_threshold(caplog):
    with caplog.at_level(logging.WARNING, logger="app.services.summarization"):
        _warn_if_slow("individual", PERFORMANCE_TARGET_MS + 1)

    assert any("individual" in record.getMessage() for record in caplog.records)


def test_warn_if_slow_does_not_log_when_under_threshold(caplog):
    with caplog.at_level(logging.WARNING, logger="app.services.summarization"):
        _warn_if_slow("individual", PERFORMANCE_TARGET_MS - 1)

    assert caplog.records == []
