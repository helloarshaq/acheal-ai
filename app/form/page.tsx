"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Upload, Info, AlertTriangle } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import localFont from "next/font/local"
import { motion } from "framer-motion"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import YouTubePlayerModal from "@/app/components/YouTubePlayerModal"
// Update the font paths with absolute paths starting from public directory
const aeonikPro = localFont({
  src: [
    {
      path: "../../public/fonts/AeonikProTRIAL-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/AeonikProTRIAL-Bold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-aeonik-pro",
})

// Update the FormStep type to include the new "age" step
type FormStep = "welcome" | "name" | "age" | "skinType" | "upload" | "confirm"

export default function FormPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()

  // Check for step parameter and user data from URL
  const stepParam = searchParams.get("step")
  const nameParam = searchParams.get("name")
  const ageParam = searchParams.get("age")
  const skintypeParam = searchParams.get("skintype")
  const userIdParam = searchParams.get("userId")

  const [currentStep, setCurrentStep] = useState<FormStep>(stepParam === "upload" ? "upload" : "welcome")

  const [name, setName] = useState("")
  const [age, setAge] = useState("")
  const [skinType, setSkinType] = useState("")
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [imageUploadedMessage, setImageUploadedMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [user, setUser] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check if user is logged in and handle URL parameters
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)

      // First, check for URL parameters (from re-upload scenario)
      if (nameParam) setName(nameParam)
      if (ageParam) setAge(ageParam)
      if (skintypeParam) setSkinType(skintypeParam)

      if (user) {
        // Try to get user profile data only if no URL params
        if (!nameParam && !ageParam && !skintypeParam) {
          const { data } = await supabase.from("users").select("*").eq("auth_id", user.id).single()

          if (data) {
            // Pre-fill form with existing user data if available
            if (data.name) setName(data.name)
            if (data.age) setAge(data.age)
            if (data.skintype) setSkinType(data.skintype)
          }
        }
      }
    }

    checkUser()
  }, [supabase, nameParam, ageParam, skintypeParam])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        // Show loading state
        setImageUploadedMessage("Processing image...")

        // Convert the file to base64
        const base64 = await convertFileToBase64(file)
        setUploadedImage(base64)
        setImageUploadedMessage("Image processed successfully!")

        // Automatically proceed to the next step after successful upload
        setTimeout(() => {
          setCurrentStep("confirm")
        }, 1000) // Small delay to show the success message
      } catch (error) {
        console.error("Error processing image:", error)
        setErrorMessage(`Failed to process image: ${(error as Error).message}`)
      }
    }
  }

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result)
        } else {
          reject(new Error("Failed to convert file to base64"))
        }
      }
      reader.onerror = () => {
        reject(new Error("Failed to read file"))
      }
      reader.readAsDataURL(file)
    })
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleNext = () => {
    // Check for validation based on current step
    if (currentStep === "name" && !name.trim()) {
      setErrorMessage("Name is required.")
      return
    }

    if (currentStep === "age") {
      const ageNum = Number.parseInt(age.trim(), 10)
      if (!age.trim() || isNaN(ageNum)) {
        setErrorMessage("Age is required and must be a number.")
        return
      }
      if (ageNum < 18 || ageNum > 100) {
        setErrorMessage("Age must be between 18 and 100.")
        return
      }
    }

    if (currentStep === "skinType" && !skinType) {
      setErrorMessage("Please select a skin type.")
      return
    }

    if (currentStep === "upload" && !uploadedImage) {
      setErrorMessage("Please upload an image.")
      return
    }

    // If no errors, proceed to the next step
    setErrorMessage(null) // Clear any previous error message
    switch (currentStep) {
      case "welcome":
        setCurrentStep("name")
        break
      case "name":
        setCurrentStep("age")
        break
      case "age":
        setCurrentStep("skinType")
        break
      case "skinType":
        setCurrentStep("upload")
        break
      case "upload":
        setCurrentStep("confirm")
        break
    }
  }

  const handleBack = () => {
    switch (currentStep) {
      case "name":
        setCurrentStep("welcome")
        break
      case "age":
        setCurrentStep("name")
        break
      case "skinType":
        setCurrentStep("age")
        break
      case "upload":
        setCurrentStep("skinType")
        break
      case "confirm":
        setCurrentStep("upload")
        break
    }
  }

  const handleSubmitForm = async () => {
    if (isSubmitting) return

    try {
      setIsSubmitting(true)

      let userId: string | undefined

      // Check if we have a userIdParam (from re-upload scenario)
      if (userIdParam) {
        // Update existing user record
        const { data, error } = await supabase
          .from("users")
          .update({
            name,
            age,
            skintype: skinType,
            imageurl: uploadedImage,
            acnetype: null, // Reset acne type since we're uploading a new image
            severity: null, // Reset severity
            severity_num: null, // Reset severity number
          })
          .eq("id", userIdParam)
          .select()

        if (error) throw error
        userId = userIdParam
      } else if (user) {
        // Check if user already has a profile
        const { data: existingProfile } = await supabase.from("users").select("id").eq("auth_id", user.id).single()

        if (existingProfile) {
          // Update existing profile
          const { data, error } = await supabase
            .from("users")
            .update({
              name,
              age,
              skintype: skinType,
              imageurl: uploadedImage,
            })
            .eq("id", existingProfile.id)
            .select()

          if (error) throw error
          if (data && data[0]) userId = data[0].id
          else userId = existingProfile.id
        } else {
          // Create new profile linked to auth user
          const { data, error } = await supabase
            .from("users")
            .insert([
              {
                auth_id: user.id,
                name,
                age,
                skintype: skinType,
                imageurl: uploadedImage,
              },
            ])
            .select()

          if (error) throw error
          if (data && data[0]) userId = data[0].id
        }
      } else {
        // Anonymous user - create record without auth_id
        const { data, error } = await supabase
          .from("users")
          .insert([
            {
              name,
              age,
              skintype: skinType,
              imageurl: uploadedImage,
            },
          ])
          .select()

        if (error) throw error
        if (data && data[0]) userId = data[0].id
      }

      // Navigate to results page with the user ID
      if (userId) {
        router.push(`/results?id=${userId}`)
      }
    } catch (error) {
      console.error("Error submitting form:", error)
      setErrorMessage(`Failed to submit form: ${(error as Error).message}`)
      setIsSubmitting(false)
    }
  }

  const handleChangeImage = () => {
    setCurrentStep("upload")
  }

  return (
    <div className={`min-h-screen bg-[#EEEBE7] ${aeonikPro.variable}`}>
      <div className="flex items-center justify-center p-4 min-h-screen">
        <div className="w-full max-w-[1380px] flex flex-col md:flex-row rounded-[30px] overflow-hidden bg-white shadow-lg">
          {/* Left side - Image (hidden on mobile) */}
          <motion.div
            className="relative hidden md:block md:w-1/2 overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
          >
            {currentStep === "confirm" && uploadedImage ? (
              <div className="relative w-full h-full">
                <Image
                  src={uploadedImage || "/placeholder.svg"}
                  alt="Uploaded face"
                  width={812}
                  height={938}
                  className="object-cover rounded-[24px] border-none"
                  priority
                />
              </div>
            ) : (
              <div className="relative w-full h-full">
                <Image
                  src="/images/form-face-new.jpeg"
                  alt="Beauty face with mask"
                  width={812}
                  height={938}
                  className="object-cover rounded-[24px] border-none"
                  priority
                />
              </div>
            )}
          </motion.div>

          {/* Right side - Form content (full width on mobile) */}
          <div className="w-full md:w-1/2 p-6 md:p-12 bg-[#E5E1DB] min-h-[90vh] flex flex-col">
            {/* Logo at the top with gradient */}
            <div className="flex justify-center mb-8 pt-4">
              <Link
                href="/"
                className="text-3xl md:text-4xl font-light bg-gradient-to-r from-[#E4B2BE] via-[#80629A] to-[#355C73] bg-clip-text text-transparent"
              >
                acheal.ai
              </Link>
            </div>

            {/* Form content based on current step - centered vertically */}
            <div className="flex-grow flex flex-col justify-center">
              <div className="mb-auto"></div> {/* Spacer to push content to center */}
              <div className="mb-8">
                {currentStep === "welcome" && <WelcomeStep onNext={handleNext} isLoggedIn={!!user} />}

                {currentStep === "name" && <NameStep name={name} setName={setName} />}

                {currentStep === "age" && <AgeStep age={age} setAge={setAge} />}

                {currentStep === "skinType" && (
                  <SkinTypeStep skinType={skinType} setSkinType={setSkinType} name={name} />
                )}

                {currentStep === "upload" && (
                  <UploadStep
                    handleUploadClick={handleUploadClick}
                    fileInputRef={fileInputRef}
                    handleFileChange={handleFileChange}
                  />
                )}

                {currentStep === "confirm" && (
                  <ConfirmStep
                    onConfirm={handleSubmitForm}
                    onChangeImage={handleChangeImage}
                    isSubmitting={isSubmitting}
                  />
                )}
              </div>
              <div className="mb-auto"></div> {/* Spacer to push content to center */}
              {/* Error Message */}
              {errorMessage && <div className="text-red-500 text-sm mb-4">{errorMessage}</div>}
              {/* Image Upload Success Message */}
              {imageUploadedMessage && <div className="text-green-500 text-sm mb-4">{imageUploadedMessage}</div>}
              {/* Navigation buttons */}
              {currentStep !== "welcome" && currentStep !== "confirm" && (
                <div className="flex justify-between mt-4 mb-8">
                  <button
                    onClick={handleBack}
                    className="border border-[#000] rounded-full px-6 md:px-8 py-2 hover:bg-black hover:text-white transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleNext}
                    className="border border-[#000] rounded-full px-6 md:px-8 py-2 hover:bg-black hover:text-white transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            {/* Disclaimer at the bottom */}
            <div className="text-xs text-[#6A6A6A] mt-4 text-center">
              Note: <span className="underline">Acheal.ai</span> is not 100% correct, we advise to check in with your
              dermatologist if you think your case is very rare or serious
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Welcome step
function WelcomeStep({ onNext, isLoggedIn }: { onNext: () => void; isLoggedIn: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-3xl md:text-4xl font-light mb-4 text-center">Lets Start!</h1>
      <p className="text-[#6A6A6A] text-lg mb-12 text-center">
        Fill up a form so we can provide promising results.
        {isLoggedIn && (
          <span className="block mt-2 text-green-600">You're signed in! Your progress will be saved.</span>
        )}
      </p>
      <button
        onClick={onNext}
        className="border border-[#000] rounded-full px-8 py-2 hover:bg-black hover:text-white transition-colors"
      >
        Get started
      </button>
    </div>
  )
}

// Name step
function NameStep({ name, setName }: { name: string; setName: (name: string) => void }) {
  return (
    <div>
      <h1 className="text-2xl md:text-3xl lg:text-4xl font-light mb-4">What is your Name?</h1>
      <p className="text-[#6A6A6A] text-base md:text-lg mb-8 md:mb-12">Please Type Your name</p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="w-full bg-black text-white rounded-full px-6 py-3 focus:outline-none"
      />
    </div>
  )
}

// Age step
function AgeStep({ age, setAge }: { age: string; setAge: (age: string) => void }) {
  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value

    // Allow empty string for clearing the input
    if (value === "") {
      setAge("")
      return
    }

    // Allow typing numbers, but validate the range
    const numValue = Number.parseInt(value, 10)
    if (!isNaN(numValue) && numValue >= 0) {
      setAge(value)
    }
  }

  return (
    <div>
      <h1 className="text-2xl md:text-3xl lg:text-4xl font-light mb-4">What is your Age?</h1>
      <p className="text-[#6A6A6A] text-base md:text-lg mb-8 md:mb-12">Please enter your age (18-100)</p>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={age}
        onChange={handleAgeChange}
        placeholder="Your age"
        className="w-full bg-black text-white rounded-full px-6 py-3 focus:outline-none"
      />
    </div>
  )
}

// Skin type step
function SkinTypeStep({
  skinType,
  setSkinType,
  name,
}: {
  skinType: string
  setSkinType: (type: string) => void
  name: string
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const youtubeVideoId = "9lpNctzBqa8" // Extracted from https://youtu.be/9lpNctzBqa8?si=SmcPz_N8uUNH-yhi

  return (
    <div>
      <div className="flex items-center mb-4">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-light">
          {name ? `${name}, what is your skin type?` : "What is your skin type?"}
        </h1>
        <button onClick={() => setIsModalOpen(true)} className="ml-2 text-gray-500 hover:text-black">
          <Info size={20} />
        </button>
      </div>
      <p className="text-[#6A6A6A] text-base md:text-lg mb-8 md:mb-12">Please Select 1 Option</p>

      <div className="flex flex-wrap gap-4">
        <button
          onClick={() => setSkinType("Dry")}
          className={`rounded-full px-6 py-2 transition-colors ${
            skinType === "Dry" ? "bg-black text-white" : "bg-white border border-black"
          }`}
        >
          Dry
        </button>
        <button
          onClick={() => setSkinType("Oily")}
          className={`rounded-full px-6 py-2 transition-colors ${
            skinType === "Oily" ? "bg-black text-white" : "bg-white border border-black"
          }`}
        >
          Oily
        </button>
        <button
          onClick={() => setSkinType("Mixed")}
          className={`rounded-full px-6 py-2 transition-colors ${
            skinType === "Mixed" ? "bg-black text-white" : "bg-white border border-black"
          }`}
        >
          Mixed
        </button>
      </div>
      <YouTubePlayerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} videoId={youtubeVideoId} />
    </div>
  )
}

// Upload step
function UploadStep({
  handleUploadClick,
  fileInputRef,
  handleFileChange,
}: {
  handleUploadClick: () => void
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  const [error, setError] = useState<string | null>(null)

  const validateAndHandleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check if the file is an image
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPEG, PNG, etc.)')
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // Check file size (limit to 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB in bytes
    if (file.size > maxSize) {
      setError('File size should be less than 5MB')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setError(null)
    handleFileChange(e)
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={validateAndHandleFile}
        accept="image/jpeg,image/png,image/jpg,image/webp"
        className="hidden"
      />
      <button
        onClick={handleUploadClick}
        className="border border-black rounded-full px-6 py-3 flex items-center gap-2 hover:bg-black hover:text-white transition-colors"
      >
        <Upload size={18} />
        Upload Your Picture
      </button>
      {error && (
        <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
          <AlertTriangle size={14} />
          {error}
        </p>
      )}
      <p className="text-sm text-gray-500">
        Supported formats: JPEG, PNG, JPG, WEBP (max 5MB)
      </p>
    </div>
  )
}

// Confirm step
function ConfirmStep({
  onConfirm,
  onChangeImage,
  isSubmitting,
}: {
  onConfirm: () => void
  onChangeImage: () => void
  isSubmitting: boolean
}) {
  return (
    <div>
      <h1 className="text-2xl md:text-3xl lg:text-4xl font-light mb-4">Are you sure about this image?</h1>
      <div className="space-y-4 mt-8">
        <button
          onClick={onConfirm}
          disabled={isSubmitting}
          className="w-full border border-black rounded-full px-6 py-3 hover:bg-black hover:text-white transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Processing..." : "Yes! Tell me My acne Type"}
        </button>
        <button
          onClick={onChangeImage}
          disabled={isSubmitting}
          className="w-full border border-[#693709] text-[#693709] rounded-full px-6 py-3 hover:bg-[#693709] hover:text-white transition-colors disabled:opacity-50"
        >
          NO. I want to Change This image
        </button>
      </div>
    </div>
  )
}