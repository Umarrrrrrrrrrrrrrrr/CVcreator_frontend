import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../Navbar/Navbar";
import { getApiUrl, fetchWithAuth } from "../../config/api";
import API_CONFIG from "../../config/api";

const PROFILE_STORAGE_KEY = "userProfile";

const Profile = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isGuest, getAccessToken } = useAuth();
  const canAccess = isAuthenticated || isGuest;

  const [profile, setProfile] = useState({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    bio: "",
    location: "",
    linkedIn: "",
    website: "",
  });
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch profile from API (when authenticated with token) or localStorage (guest)
  useEffect(() => {
    if (!canAccess) {
      navigate("/login");
      return;
    }
    const token = getAccessToken();
    if (token && isAuthenticated && !isGuest) {
      setLoading(true);
      fetchWithAuth(getApiUrl(API_CONFIG.ENDPOINTS.PROFILE))
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.user) {
            const u = data.user;
            setProfile({
              fullName: u.full_name || (u.first_name || u.last_name ? `${u.first_name || ""} ${u.last_name || ""}`.trim() : "") || u.username || "",
              username: u.username || "",
              email: u.email || "",
              phone: u.phone || "",
              bio: u.bio || "",
              location: u.location || "",
              linkedIn: u.linkedin_url || "",
              website: u.website_url || "",
            });
            if (u.profile_photo_url) {
              setProfilePhoto(u.profile_photo_url);
              localStorage.setItem(`${PROFILE_STORAGE_KEY}_photo`, u.profile_photo_url);
              window.dispatchEvent(new CustomEvent("profilePhotoUpdated"));
            }
          }
        })
        .catch(() => {
          const savedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
          if (savedProfile) {
            try {
              setProfile(JSON.parse(savedProfile));
            } catch (_) {}
          }
        })
        .finally(() => setLoading(false));
    } else {
      const savedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (savedProfile) {
        try {
          setProfile(JSON.parse(savedProfile));
        } catch (_) {}
      }
      const savedPhoto = localStorage.getItem(`${PROFILE_STORAGE_KEY}_photo`);
      if (savedPhoto) setProfilePhoto(savedPhoto);
      if (user) {
        setProfile((prev) => ({
          ...prev,
          username: user.username ?? prev.username,
          email: user.email ?? prev.email,
          fullName: (user.full_name ?? prev.fullName) || (user.username ?? ""),
          phone: user.phone ?? prev.phone,
          location: user.location ?? prev.location,
          bio: user.bio ?? prev.bio,
          linkedIn: user.linkedin_url ?? prev.linkedIn,
          website: user.website_url ?? prev.website,
        }));
        if (user.profile_photo_url) setProfilePhoto(user.profile_photo_url);
      }
    }
  }, [canAccess, navigate, isAuthenticated, isGuest, getAccessToken]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
    setSaved(false);
    setError("");
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setProfilePhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePhoto(reader.result);
      if (isGuest) localStorage.setItem(`${PROFILE_STORAGE_KEY}_photo`, reader.result);
      setSaved(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    const token = getAccessToken();
    if (isAuthenticated && !isGuest && !token) {
      setError("Please log out and log in again to save your profile to your account.");
      return;
    }
    if (token && isAuthenticated && !isGuest) {
      setLoading(true);
      setError("");
      try {
        let res;
        if (profilePhotoFile) {
          const formData = new FormData();
          formData.append("full_name", profile.fullName);
          formData.append("username", profile.username);
          formData.append("phone", profile.phone || "");
          formData.append("location", profile.location || "");
          formData.append("bio", profile.bio || "");
          formData.append("linkedin_url", profile.linkedIn || "");
          formData.append("website_url", profile.website || "");
          formData.append("profile_photo", profilePhotoFile);

          res = await fetchWithAuth(getApiUrl(API_CONFIG.ENDPOINTS.PROFILE), {
            method: "PUT",
            body: formData,
          });
        } else {
          res = await fetchWithAuth(getApiUrl(API_CONFIG.ENDPOINTS.PROFILE), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              full_name: profile.fullName,
              username: profile.username,
              phone: profile.phone || "",
              location: profile.location || "",
              bio: profile.bio || "",
              linkedin_url: profile.linkedIn || "",
              website_url: profile.website || "",
            }),
          });
        }
        const data = await res.json();
        if (res.ok && data.success) {
          setIsEditing(false);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
          setProfilePhotoFile(null);
          if (data.user?.profile_photo_url) {
            localStorage.setItem(`${PROFILE_STORAGE_KEY}_photo`, data.user.profile_photo_url);
            window.dispatchEvent(new CustomEvent("profilePhotoUpdated"));
          }
        } else {
          setError(data.message || data.errors ? Object.values(data.errors || {}).flat().join(" ") : "Failed to save");
        }
      } catch (err) {
        setError(err.message || "Failed to save profile");
      } finally {
        setLoading(false);
      }
    } else {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
      if (profilePhoto && !profilePhoto.startsWith("http")) {
        localStorage.setItem(`${PROFILE_STORAGE_KEY}_photo`, profilePhoto);
      }
      setIsEditing(false);
      setSaved(true);
      setError(isGuest ? "Saved locally. Log in with your account to save to the database." : "");
      setTimeout(() => { setSaved(false); setError(""); }, 3000);
    }
  };

  if (!canAccess) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8">
            <h1 className="text-3xl font-bold text-white">Profile</h1>
            <p className="text-blue-100 mt-1">Manage your account information</p>
          </div>

          <div className="p-6 md:p-8 space-y-8">
            {/* Photo Holder */}
            <div className="flex flex-col items-center">
              <div className="relative group">
                <div
                  className="w-32 h-32 rounded-full border-4 border-gray-200 overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors"
                  onClick={() => document.getElementById("photoInput").click()}
                >
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => document.getElementById("photoInput").click()}>
                  <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">Change</span>
                </div>
                <input type="file" id="photoInput" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </div>
              <p className="mt-2 text-sm text-gray-500">Click to upload or change photo</p>
            </div>

            {/* Editable Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={profile.fullName}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="Your full name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  name="username"
                  value={profile.username}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="Username"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="email@example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="+1 234 567 8900"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  name="location"
                  value={profile.location}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="City, Country"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Bio</label>
                <textarea
                  name="bio"
                  value={profile.bio}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-600 resize-y"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">LinkedIn</label>
                <input
                  type="url"
                  name="linkedIn"
                  value={profile.linkedIn}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="https://linkedin.com/in/yourprofile"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Website</label>
                <input
                  type="url"
                  name="website"
                  value={profile.website}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="https://yourwebsite.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-600"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-4 pt-4">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
                >
                  Edit Profile
                </button>
              )}
              {saved && (
                <span className="flex items-center gap-2 text-green-600 font-medium py-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved successfully
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
