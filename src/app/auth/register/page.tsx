"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignUpForm } from "@/components/auth/SignUpForm";

export default function RegisterPage() {
  return <SignUpForm />;
}
