package com.wssd.module.ads;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AdSlotRepository extends JpaRepository<AdSlot, Integer> {
    List<AdSlot> findByActiveTrueAndShowFromDownloadNLessThanEqual(int downloadCount);
}
