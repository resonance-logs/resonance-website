"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { SupporterThankYouModal } from "./SupporterThankYouModal";

/**
 * Global provider for the supporter thank-you modal.
 * This component listens for the notify_supporter flag from the user data
 * and shows a celebratory modal when the user has made a new donation.
 */
export const SupporterNotificationProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [hasShownForSession, setHasShownForSession] = useState(false);

  useEffect(() => {
    // Only show the modal once per session and when the flag is true
    if (
      !isLoading &&
      user?.notify_supporter &&
      !hasShownForSession
    ) {
      setShowModal(true);
      setHasShownForSession(true);
    }
  }, [user, isLoading, hasShownForSession]);

  const handleClose = () => {
    setShowModal(false);
  };

  return (
    <>
      {children}
      <SupporterThankYouModal isOpen={showModal} onClose={handleClose} />
    </>
  );
};
