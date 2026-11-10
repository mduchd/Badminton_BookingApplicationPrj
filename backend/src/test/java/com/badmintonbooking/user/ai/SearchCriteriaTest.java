package com.badmintonbooking.user.ai;
import com.badmintonbooking.user.ai.dto.SearchCriteriaDto;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class SearchCriteriaTest {
    @Test void rejectsMalformedTimesAndNonFinitePrices() {
        var criteria = new SearchCriteriaDto();
        criteria.setStartTime("19:00:01"); assertFalse(criteria.isValid());
        criteria.setStartTime("25:00"); assertFalse(criteria.isValid());
        criteria.setStartTime("19:00"); criteria.setEndTime("18:00"); assertFalse(criteria.isValid());
        criteria.setEndTime("21:00"); criteria.setMaxPricePerHour(Double.NaN); assertFalse(criteria.isValid());
        criteria.setMaxPricePerHour(150000.0); criteria.setDate("2027-02-30"); assertFalse(criteria.isValid());
        criteria.setDate("2027-02-28"); assertTrue(criteria.isValid());
    }
}
