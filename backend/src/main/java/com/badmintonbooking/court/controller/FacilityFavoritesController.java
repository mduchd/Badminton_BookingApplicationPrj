package com.badmintonbooking.court.controller;

import com.badmintonbooking.common.exception.ResourceNotFoundException;
import com.badmintonbooking.court.repository.FacilityRepository;
import com.badmintonbooking.security.CurrentUserService;
import com.badmintonbooking.user.entity.User;
import com.badmintonbooking.user.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Set;

@RestController
@RequestMapping("/api/facilities/favorites")
public class FacilityFavoritesController {

    private final CurrentUserService currentUser;
    private final UserRepository users;
    private final FacilityRepository facilities;

    public FacilityFavoritesController(CurrentUserService currentUser, UserRepository users, FacilityRepository facilities) {
        this.currentUser = currentUser;
        this.users = users;
        this.facilities = facilities;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public Set<Long> getFavorites(Principal principal) {
        return Set.copyOf(currentUser.requireActiveUser(principal).getFavoriteFacilityIds());
    }

    @PutMapping("/{facilityId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void addFavorite(@PathVariable Long facilityId, Principal principal) {
        User user = lockUser(principal);
        if (!facilities.existsById(facilityId)) {
            throw new ResourceNotFoundException("Không tìm thấy cụm sân.");
        }
        user.getFavoriteFacilityIds().add(facilityId);
    }

    @DeleteMapping("/{facilityId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void removeFavorite(@PathVariable Long facilityId, Principal principal) {
        lockUser(principal).getFavoriteFacilityIds().remove(facilityId);
    }

    private User lockUser(Principal principal) {
        return users.findByIdForUpdate(currentUser.requireActiveUser(principal).getId()).orElseThrow();
    }
}
