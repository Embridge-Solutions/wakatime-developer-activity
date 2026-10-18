"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { usePageTitle } from "@/contexts/page-title-context";
import ButtonComponent from "@/components/layout/button-component";
import { getUserData } from "@/utils/auth-store";
import { useUpdateProfileMutation } from "@/redux/slice/user";
import { showAlert } from "@/components/common/AlertHandler";
import { APP_CONFIG } from "@/config/config";
import { User } from "lucide-react";

const PersonalInformationPage = () => {
  const { setPageTitle } = usePageTitle();
  const [updateUser, { isLoading }] = useUpdateProfileMutation();

  const [formData, setFormData] = useState({
    id: null as number | null,
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    phone: "",
    location: "",
  });

  useEffect(() => {
    setPageTitle("Personal Information");
    const user = getUserData();
    if (user) {
      setFormData({
        id: user.id,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        username: user.username || "",
        email: user.email || "",
        phone: user.phone || "",
        location: (user as any).location || "",
      });
    }
  }, [setPageTitle]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.id) {
      return showAlert({
        status: "error",
        message: "User ID missing. Try logging in again.",
      });
    }

    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
        // specifically NOT sending username as it should not be updated per requirements
      };

      const res = await updateUser({
        id: formData.id,
        data: payload,
      }).unwrap();

      if (!res?.error) {
        // Sync local storage so top-bar updates dynamically
        const currentUserData = getUserData();
        if (currentUserData) {
          const updatedData = { ...currentUserData, ...payload };
          localStorage.setItem(
            APP_CONFIG.USER_DETAILS_KEY,
            JSON.stringify(updatedData),
          );
        }

        showAlert({
          status: "success",
          message: "Profile updated successfully!",
        });
        // setTimeout(() => {
        //   window.location.reload();
        // }, 800);
      } else {
        showAlert({
          status: "error",
          message: res?.error?.data?.msg || "Failed to update profile",
        });
      }
    } catch (err: any) {
      console.log("Update Error:", err);
      showAlert({
        status: "error",
        message: err?.data?.msg || "Something went wrong while updating",
      });
    }
  };

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      {/* Header Section */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100 mb-8">
        <div
          className="p-2.5 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: "var(--action-soft)", color: "var(--action)" }}
        >
          <User className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--theme-sidebar-bg)" }}>
          Personal Information
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Username (Disabled) */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-default-bg block">
            Username (Read Only)
          </label>
          <Input
            type="text"
            name="username"
            value={formData.username}
            disabled
            className="text-gray-500 bg-gray-200 border-0 border-none h-10 font-medium cursor-not-allowed opacity-80"
          />
        </div>

        <div className="space-y-2"></div>

        {/* First Name */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-default-bg block">
            First Name
          </label>
          <Input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="Enter your first name"
            required
            className="text-slate-800 bg-gray-100 border border-transparent h-10 font-medium placeholder:text-text-light-color placeholder:text-sm focus:border-action focus:ring-1 focus:ring-action-soft transition-all"
          />
        </div>

        {/* Last Name */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-default-bg block">
            Last Name
          </label>
          <Input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Enter your last name"
            required
            className="text-slate-800 bg-gray-100 border border-transparent h-10 font-medium placeholder:text-text-light-color placeholder:text-sm focus:border-action focus:ring-1 focus:ring-action-soft transition-all"
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-default-bg block">
            Email
          </label>
          <Input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            required
            className="text-slate-800 bg-gray-100 border border-transparent h-10 font-medium placeholder:text-text-light-color placeholder:text-sm focus:border-action focus:ring-1 focus:ring-action-soft transition-all"
          />
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-default-bg block">
            Phone Number
          </label>
          <Input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Enter your phone number"
            className="text-slate-800 bg-gray-100 border border-transparent h-10 font-medium placeholder:text-text-light-color placeholder:text-sm focus:border-action focus:ring-1 focus:ring-action-soft transition-all"
          />
        </div>

        {/* Location */}
        {/* <div className='space-y-2'>
          <label className='text-sm font-semibold text-default-bg block'>
            Location
          </label>
          <Input
            type='text'
            name='location'
            value={formData.location}
            onChange={handleChange}
            placeholder='Enter your location'
            className='text-slate-800 bg-gray-100 border border-transparent h-10 font-medium placeholder:text-text-light-color placeholder:text-sm focus:border-action focus:ring-1 focus:ring-action-soft transition-all'
          />
        </div> */}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-3 justify-end">
        <ButtonComponent
          type="button"
          variant="outline"
          className="text-action border-action/30 hover:border-action hover:text-action hover:bg-action-soft transition-all"
          handleClick={() => {
            const user = getUserData();
            if (user) {
              setFormData({
                id: user.id,
                firstName: user.firstName || "",
                lastName: user.lastName || "",
                username: user.username || "",
                email: user.email || "",
                phone: user.phone || "",
                location: (user as any).location || "",
              });
            }
          }}
          text="Discard Changes"
        />
        <ButtonComponent
          type="submit"
          variant="default"
          className="bg-action hover:bg-action-hover text-action-foreground shadow-md shadow-action/10 transition-all"
          handleClick={() => {}}
          text={isLoading ? "Saving..." : "Save Changes"}
        />
      </div>
    </form>
  );
};

export default PersonalInformationPage;
