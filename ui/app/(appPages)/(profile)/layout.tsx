"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { profileMenuData } from "@/config/data-config";
import { clearTokens } from "@/utils/auth";
import { cn } from "@/lib/utils";
import { useUserLogoutMutation } from "@/redux/slice/auth";
import { getUserData } from "@/utils/auth-store";
import { ConfirmActionDialog } from "@/components/common/confirmationDialog";

const getInitials = (name: string) => {
  if (!name) return "U";
  const trimmed = name.trim();
  if (trimmed.includes(" ")) {
    const parts = trimmed.split(/\s+/);
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }
  return (
    trimmed.charAt(0) +
    (trimmed.length > 1 ? trimmed.charAt(trimmed.length - 1) : "")
  ).toUpperCase();
};

const ProfileLayout = ({
  children,
}: Readonly<{ children: React.ReactNode }>) => {

  const [userLogout] = useUserLogoutMutation();

  const router = useRouter();
  const currentPath = usePathname();
  const [pathName, setPathName] = useState("");
  const [userData, setUserData] = useState({ name: "Loading...", email: "" });
  const [openDialog, setOpenDialog] = useState(false);


  const handleLogout = () => {
    setOpenDialog(true);
  }

  const handleLogoutConfirm = async () => {
    try {
      await userLogout().unwrap();
      clearTokens();
      router.push('/login');
    } catch (error) {
      console.log('error', error);
    }
  };

  useEffect(() => {
    setPathName(currentPath);
    const data = getUserData();
    if (data) {
      setUserData({
        name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.username || 'User',
        email: data.email || 'No email available',
      });
    }
  }, [currentPath]);

  return (
    <section>
      <div className=" ">
        {/* Profile Image Section */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-4 bg-white rounded-lg p-4 min-h-[500px] h-max-content">
            <div className="mb-10 flex flex-col items-center">
              <div className="relative mb-6">
                {/* Outer ring */}
                <div className="absolute inset-0 -m-1 rounded-full border border-gray-100" />
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-theme-gradient-from to-theme-gradient-to flex items-center justify-center overflow-hidden border-4 border-white shadow-[0_0_20px_var(--theme-glow)] ring-1 ring-gray-100">
                  <span className="text-3xl font-black tracking-tighter text-white">
                    {getInitials(userData.name)}
                  </span>
                </div>
              </div>
              <h2 className="text-2xl font-black tracking-tight capitalize" style={{ color: 'var(--theme-sidebar-bg)' }}>
                {userData.name}
              </h2>
              <div className="mt-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                <p className="text-xs font-semibold text-gray-400">
                  {userData.email}
                </p>
              </div>
            </div>

            {/* Menu Tabs */}
            <div className="">
              {profileMenuData?.map((menu, index) => {
                const Icon = menu.icon;
                const isLogout = !menu.navigation;
                const isActive = String(menu?.path) === String(pathName);

                return (
                  <div key={index} className="mt-5">
                    <button
                      onClick={() =>
                        menu.navigation ? router.push(menu.path) : handleLogout()
                      }
                      className={cn(
                        "w-4/5 flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all duration-300 mx-auto cursor-pointer",
                        isActive
                          ? "text-action-foreground bg-action shadow-lg shadow-action/25"
                          : isLogout
                            ? "text-red-500/80 hover:bg-red-50"
                            : "text-gray-400 hover:text-action hover:bg-gray-50",
                      )}
                    >
                      <Icon className="h-4.5 w-4.5" />
                      {menu.label}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="col-span-8 bg-white rounded-lg p-4">{children}</div>
        </div>
      </div>

      <ConfirmActionDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onConfirm={() => handleLogoutConfirm()}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmLabel="Yes, Logout"
      />
    </section>
  );
};

export default ProfileLayout;
