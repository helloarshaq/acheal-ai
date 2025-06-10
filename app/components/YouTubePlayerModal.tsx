"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface YouTubePlayerModalProps {
  isOpen: boolean
  onClose: () => void
  videoId: string
}

const YouTubePlayerModal = ({ isOpen, onClose, videoId }: YouTubePlayerModalProps) => {
  if (!isOpen) return null

  const embedUrl = `https://www.youtube.com/embed/${videoId}`

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[625px] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>How to Determine Your Skin Type</DialogTitle>
          <DialogDescription>Watch this video to learn how to identify your skin type.</DialogDescription>
        </DialogHeader>
        <div className="aspect-video p-6 pt-2">
          <iframe
            width="100%"
            height="100%"
            src={embedUrl}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="rounded-md"
          ></iframe>
        </div>
        <DialogFooter className="p-6 pt-0">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default YouTubePlayerModal
