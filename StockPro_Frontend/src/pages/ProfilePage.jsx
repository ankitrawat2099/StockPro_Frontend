import { useState, useContext } from "react";
import { toast } from "react-toastify";
import PageHeader from "../components/PageHeader";
import { AuthContext } from "../context/AuthContext";
import { usePersistentState } from "../hooks/usePersistentState";
import { formatDate } from "../lib/utils";

const ProfilePage = () => {
  const { user, updateProfile, changePassword, logout, refreshSession } = useContext(AuthContext);
  const [profileForm, setProfileForm, clearProfileForm] = usePersistentState("draft:profile:form", {
    fullName: user?.fullName || "",
    phone: user?.phone || "",
    department: user?.department || "",
  });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
  });

  const handleProfileChange = (e) => {
    setProfileForm((current) => ({ ...current, [e.target.name]: e.target.value }));
  };

  const handlePasswordChange = (e) => {
    setPasswordForm((current) => ({ ...current, [e.target.name]: e.target.value }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();

    try {
      const nextUser = await updateProfile(profileForm);
      setProfileForm({
        fullName: nextUser?.fullName || "",
        phone: nextUser?.phone || "",
        department: nextUser?.department || "",
      });
      toast.success("Profile updated successfully.");
    } catch (submitError) {
      toast.error(submitError.message);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    try {
      await changePassword(passwordForm);
      toast.success("Password changed successfully. You will be logged out in 2 seconds...");
      setPasswordForm({ oldPassword: "", newPassword: "" });

      // Forced logout after short delay
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (submitError) {
      toast.error(submitError.message);
    }
  };

  const handleSessionRefresh = async () => {
    try {
      await refreshSession();
      toast.success("Session token refreshed successfully.");
    } catch (submitError) {
      toast.error(submitError.message);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Profile"
        title="Manage your personal account"
        description="Every role can update profile details and change password from this page."
      />

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="panel-soft p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">
            Account Details
          </p>
          <dl className="mt-5 grid gap-4 text-sm">
            <div>
              <dt className="text-ink-500">Full name</dt>
              <dd className="mt-1 font-semibold text-ink-900">{user?.fullName}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Email</dt>
              <dd className="mt-1 font-semibold text-ink-900">{user?.email}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Role</dt>
              <dd className="mt-1 font-semibold text-ink-900">{user?.role}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Created</dt>
              <dd className="mt-1 font-semibold text-ink-900">{formatDate(user?.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Last login</dt>
              <dd className="mt-1 font-semibold text-ink-900">{formatDate(user?.lastLoginAt)}</dd>
            </div>
          </dl>
          <div className="mt-5">
            <button className="secondary-btn" onClick={handleSessionRefresh} type="button">
              Refresh session token
            </button>
          </div>
        </section>

        <section className="grid gap-4">
          <form className="panel-soft p-6" onSubmit={handleProfileSubmit}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">
              Update Profile
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-ink-700">Full name</label>
                <input
                  name="fullName"
                  required
                  value={profileForm.fullName}
                  onChange={handleProfileChange}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-700">Phone</label>
                <input name="phone" value={profileForm.phone} onChange={handleProfileChange} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-700">Department</label>
                <input
                  name="department"
                  value={profileForm.department}
                  onChange={handleProfileChange}
                />
              </div>
            </div>

            <div className="mt-5 flex justify-center">
              <button className="primary-btn" type="submit">
                Save profile
              </button>
            </div>
          </form>

          <form className="panel-soft p-6" onSubmit={handlePasswordSubmit}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">
              Change Password
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-700">Old password</label>
                <input
                  name="oldPassword"
                  required
                  type="password"
                  value={passwordForm.oldPassword}
                  onChange={handlePasswordChange}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-ink-700">New password</label>
                <input
                  name="newPassword"
                  required
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                />
              </div>
            </div>

            <div className="mt-5 flex justify-center">
              <button className="primary-btn" type="submit">
                Update password
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default ProfilePage;
