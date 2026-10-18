"use client";

import { useEffect, useState } from "react";
import { usePageTitle } from "@/contexts/page-title-context";
import { Eye, EyeOff, Lock, User, ShieldCheck } from "lucide-react";
import { useUpdatePasswordMutation } from "@/redux/slice/auth";
import { showAlert } from "@/components/common/AlertHandler";
import InputGroupComponent from "@/components/layout/InputGroupComponent";
import { getUserData } from "@/utils/auth-store";

const ChangePassword = () => {
  const { setPageTitle } = usePageTitle();
  const [updatePassword, { isLoading: isUpdating }] = useUpdatePasswordMutation();

  const [loginData, setLoginData] = useState({
    username: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [userId, setUserId] = useState<number | null>(null);
  const [newPasswordView, setNewPasswordView] = useState<boolean>(false);
  const [confirmPasswordView, setConfirmPasswordView] =
    useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value,
    });
  };

  useEffect(() => {
    setPageTitle("Change Password");
  }, [setPageTitle]);

  useEffect(() => {
    const data = getUserData();
    if (data) {
      setLoginData((prev) => ({
        ...prev,
        username: data.username || data.email || 'User',
      }));
      setUserId(data.id);
    }
  }, []);

  const handleReset = () => {
    setLoginData((prev) => ({
      ...prev,
      newPassword: "",
      confirmPassword: "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      return showAlert({ status: "error", message: "User not found!" });
    }

    if (loginData.newPassword !== loginData.confirmPassword) {
      return showAlert({ status: "error", message: "Passwords do not match!" });
    }

    try {
      const payload = {
        id: userId,
        currentPassword: loginData.currentPassword,
        newPassword: loginData.newPassword,
      };

      const res = await updatePassword(payload).unwrap();

      showAlert({
        status: "success",
        message: res?.msg || "Password updated successfully!",
      });
      handleReset();

    } catch (err: any) {
      showAlert({
        status: "error",
        message: err?.data?.msg || "Failed to update password",
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-2">
      {/* Header Section */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "var(--action-soft)", color: "var(--action)" }}
          >
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--theme-sidebar-bg)" }}>
            Login & Security
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400 font-medium font-bold">
          Last updated: {new Date().toLocaleDateString()}
          <div className="w-4 h-4 flex items-center justify-center">
            <svg
              width="6"
              height="10"
              viewBox="0 0 6 10"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 9L5 5L1 1"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Account Information Card */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-bold" style={{ color: "var(--theme-sidebar-bg)" }}>
                Account Information
              </h2>
              <p className="text-sm text-gray-400">Your login credentials</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputGroupComponent
                label="Username"
                type="text"
                readOnly
                name="username"
                value={loginData.username}
                handleChange={handleChange}
                placeholder="Username"
                icon={<User className="w-5 h-5 text-gray-400" />}
                className="bg-gray-50 rounded-xl h-12 border-none py-4 text-slate-800"
              />
              <InputGroupComponent
                label="Current Password"
                type="password"
                name="currentPassword"
                value={loginData.currentPassword}
                handleChange={handleChange}
                placeholder="Enter Current Password"
                icon={<Lock className="w-5 h-5 text-gray-400" />}
                className="bg-gray-50 rounded-xl h-12 border-none py-4 text-slate-800 focus:ring-action/40"
                iconView={false}
                required
              />
            </div>
          </div>

          {/* Change Password Card */}
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-bold" style={{ color: "var(--theme-sidebar-bg)" }}>
                Change Password
              </h2>
              <p className="text-sm text-gray-400">
                Update your password securely
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputGroupComponent
                label="New Password"
                type="password"
                required
                name="newPassword"
                value={loginData.newPassword}
                handleChange={handleChange}
                placeholder="New Password"
                icon={
                  newPasswordView ? (
                    <EyeOff className="w-5 h-5 text-gray-400" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-400" />
                  )
                }
                handleIconClick={() => setNewPasswordView(!newPasswordView)}
                iconView={newPasswordView}
                className="bg-gray-50 rounded-xl h-12 border-none py-4 text-slate-800 focus:ring-action/40"
              />
              <InputGroupComponent
                label="Confirm Password"
                type="password"
                required
                name="confirmPassword"
                value={loginData.confirmPassword}
                handleChange={handleChange}
                placeholder="Confirm Password"
                icon={
                  confirmPasswordView ? (
                    <EyeOff className="w-5 h-5 text-gray-400" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-400" />
                  )
                }
                handleIconClick={() =>
                  setConfirmPasswordView(!confirmPasswordView)
                }
                iconView={confirmPasswordView}
                className="bg-gray-50 rounded-xl h-12 border-none py-4 text-slate-800 focus:ring-action/40"
              />
            </div>

            <div className="flex gap-4 pt-4 justify-end items-center border-t border-gray-50 dark:border-gray-800 mt-8">
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleReset}
                className="h-11 px-8 rounded-xl border border-action/30 text-sm font-bold text-action hover:border-action hover:bg-action-soft transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="h-11 px-8 rounded-xl bg-action hover:bg-action-hover text-action-foreground text-sm font-bold shadow-lg shadow-action/10 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-70 cursor-pointer"
              >
                {isUpdating && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {isUpdating ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};

export default ChangePassword;
