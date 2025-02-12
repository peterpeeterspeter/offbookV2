import pytest
from unittest.mock import patch

from src.services.feedback_generator import FeedbackGenerator


@pytest.fixture
def feedback_generator():
    return FeedbackGenerator()


@pytest.fixture
def mock_performance_monitor():
    with patch("src.services.feedback_generator.performance_monitor") as mock:
        yield mock


@pytest.fixture
def basic_performance_data():
    return {
        "accuracy": 0.85,
        "word_count": {"correct": 85, "expected": 100},
        "differences": {"deletions": ["word1", "word2"], "additions": ["extra1"]},
        "timing": {
            "speaking_rate": 150,
            "total_duration": 100,
            "pause_duration": 20,
            "fluency_score": 0.75,
        },
    }


@pytest.fixture
def historical_data():
    return [
        {"accuracy": 0.80, "timing": {"speaking_rate": 140, "fluency_score": 0.70}},
        {"accuracy": 0.82, "timing": {"speaking_rate": 145, "fluency_score": 0.72}},
    ]


class TestFeedbackGenerator:
    def test_initialization(self, feedback_generator):
        """Test FeedbackGenerator initialization and thresholds."""
        assert feedback_generator.thresholds["accuracy"]["excellent"] == 0.95
        assert feedback_generator.thresholds["speaking_rate"]["ideal_min"] == 130
        assert feedback_generator.thresholds["pause_ratio"]["ideal"] == 0.2

    def test_generate_feedback_basic(
        self, feedback_generator, basic_performance_data, mock_performance_monitor
    ):
        """Test basic feedback generation without historical data."""
        feedback = feedback_generator.generate_feedback(basic_performance_data)

        assert isinstance(feedback, dict)
        assert "summary" in feedback
        assert "detailed_feedback" in feedback
        assert "improvements" in feedback
        assert "strengths" in feedback
        assert feedback["progress"] is None

        mock_performance_monitor.track_latency.assert_called_once()

    def test_generate_feedback_with_history(
        self, feedback_generator, basic_performance_data, historical_data
    ):
        """Test feedback generation with historical data."""
        feedback = feedback_generator.generate_feedback(
            basic_performance_data, historical_data
        )

        assert feedback["progress"] is not None
        assert isinstance(feedback["progress"], dict)

    def test_generate_summary_excellent(self, feedback_generator):
        """Test summary generation for excellent performance."""
        data = {"accuracy": 0.96, "timing": {"fluency_score": 0.85}}
        summary = feedback_generator._generate_summary(data)

        assert "Excellent performance!" in summary
        assert "very fluent" in summary

    def test_generate_summary_poor(self, feedback_generator):
        """Test summary generation for poor performance."""
        data = {"accuracy": 0.65, "timing": {"fluency_score": 0.55}}
        summary = feedback_generator._generate_summary(data)

        assert "needs significant improvement" in summary
        assert "Focus on improving your delivery fluency" in summary

    def test_analyze_accuracy(self, feedback_generator):
        """Test accuracy analysis with various scenarios."""
        data = {
            "accuracy": 0.65,
            "word_count": {"correct": 65, "expected": 100},
            "differences": {
                "deletions": ["word1", "word2", "word3", "word4"],
                "additions": ["extra1", "extra2"],
            },
        }

        feedback = feedback_generator._analyze_accuracy(data)
        print("Actual feedback messages:", feedback)  # Debug print

        # Work on accuracy + deletions + additions
        assert len(feedback) == 3
        assert any("Work on accuracy" in msg for msg in feedback)
        assert any("You missed 4 words" in msg for msg in feedback)
        assert any(
            "You added these extra words: extra1, extra2" in msg for msg in feedback
        )

    def test_analyze_timing(self, feedback_generator):
        """Test timing analysis with various scenarios."""
        timing_data = {
            "speaking_rate": 90,  # Too slow
            "total_duration": 100,
            "pause_duration": 40,  # Too many pauses
        }

        feedback = feedback_generator._analyze_timing(timing_data)

        # Rate feedback + pause feedback
        assert len(feedback) == 2
        assert any("too slow" in msg for msg in feedback)
        assert any("pausing too frequently" in msg for msg in feedback)

    def test_identify_strengths_and_improvements(self, feedback_generator):
        """Test strengths and improvements identification."""
        data = {
            "accuracy": 0.96,
            "timing": {"speaking_rate": 150, "fluency_score": 0.85},
        }

        strengths = []
        improvements = []
        feedback_generator._identify_strengths_and_improvements(
            data, strengths, improvements
        )

        # Accuracy + pace + fluency
        assert len(strengths) == 3
        assert len(improvements) == 0
        assert "Excellent word accuracy" in strengths
        assert "Good speaking pace" in strengths
        assert "Excellent delivery fluency" in strengths

    def test_error_handling(self, feedback_generator, mock_performance_monitor):
        """Test error handling in feedback generation."""
        with pytest.raises(Exception) as exc_info:
            feedback_generator.generate_feedback({"invalid": "data"})

        assert "Feedback generation failed" in str(exc_info.value)
        mock_performance_monitor.track_error.assert_called_once_with(
            "feedback_generation"
        )

    @pytest.mark.parametrize(
        "speaking_rate,expected_feedback",
        [
            (90, "too slow"),
            (210, "too fast"),
            (150, ""),  # No feedback for ideal
        ],
    )
    def test_speaking_rate_feedback(
        self, feedback_generator, speaking_rate, expected_feedback
    ):
        """Test speaking rate feedback for different rates."""
        timing_data = {
            "speaking_rate": speaking_rate,
            "total_duration": 100,
            "pause_duration": 20,
        }

        feedback = feedback_generator._analyze_timing(timing_data)

        if expected_feedback:
            assert any(expected_feedback in msg for msg in feedback)
        else:
            assert not any("speaking rate" in msg for msg in feedback)

    def test_progress_analysis(
        self, feedback_generator, basic_performance_data, historical_data
    ):
        """Test progress analysis with historical data."""
        feedback = feedback_generator.generate_feedback(
            basic_performance_data, historical_data
        )

        progress = feedback["progress"]
        print("Actual progress data:", progress)  # Debug print

        assert progress is not None
        assert "accuracy_change" in progress
        assert "is_improving" in progress
        assert "timing_progress" in progress
        assert progress["accuracy_change"] > 0
        assert progress["is_improving"] is True
        assert isinstance(progress["timing_progress"], dict)
        assert "fluency_change" in progress["timing_progress"]
        assert "is_improving" in progress["timing_progress"]
