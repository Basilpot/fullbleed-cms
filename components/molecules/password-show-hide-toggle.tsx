import { EyeIcon, EyeOff } from 'lucide-react'
import { useState } from 'react'
export const PasswordShowHideToggle = ({
    inputElementId,
}: {
    inputElementId: string
}) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false)

    const togglePasswordVisibility = () => {
        const passwordInput = document.getElementById(inputElementId)
        if (passwordInput) {
            const newType = isPasswordVisible ? 'password' : 'text'
            passwordInput.setAttribute('type', newType)
            setIsPasswordVisible(!isPasswordVisible)
        }
    }

    return (
        <div
            onClick={togglePasswordVisibility}
            className="hover:cursor-pointer hover:text-primary ease-in-out duration-150"
        >
            {isPasswordVisible ? <EyeOff /> : <EyeIcon />}
        </div>
    )
}