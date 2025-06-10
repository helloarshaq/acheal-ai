// This file is just to verify the border-radius is being applied correctly
// You can delete this file after confirming the issue is fixed

export default function DebugPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Border Radius Debug</h1>

      <div className="bg-black w-[300px] h-[200px] rounded-[30px] mb-8">
        <p className="text-white p-4">This box has border-radius: 30px</p>
      </div>

      <div className="bg-gray-800 w-[300px] h-[200px] rounded-3xl mb-8">
        <p className="text-white p-4">This box has rounded-3xl (24px)</p>
      </div>

      <div className="bg-gray-600 w-[300px] h-[200px] rounded-2xl mb-8">
        <p className="text-white p-4">This box has rounded-2xl (16px)</p>
      </div>

      <div className="bg-gray-400 w-[300px] h-[200px] rounded-xl">
        <p className="text-white p-4">This box has rounded-xl (12px)</p>
      </div>
    </div>
  )
}
