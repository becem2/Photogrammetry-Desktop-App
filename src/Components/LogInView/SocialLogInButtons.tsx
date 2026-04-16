import { Apple} from 'lucide-react';
import { 
    SiGooglechrome, 
    SiFacebook, 
    SiGithub 
} from '@icons-pack/react-simple-icons';


interface ButtonProps {
    text: string;
    onClick?: () => void;
}

function Button({ text, onClick }: ButtonProps) {
    // Map the button label to the matching provider icon.
    const getIcon = (iconName: string) => {
        switch (iconName) {
            case 'Google':
                return <SiGooglechrome size={22}/>;
            case 'Facebook':
                return <SiFacebook size={22}/>;
            case 'Apple':
                return <Apple size={22} />;
            case 'Github':
                return <SiGithub size={22}/>;
            default:
                return null;
        }
    };

    return (
        <button
            className="flex items-center justify-center border border-gray-200 rounded-lg p-2.5 gap-2.5 bg-white cursor-pointer text-sm font-medium w-full transition-all duration-300 hover:bg-gray-100 hover:shadow-sm hover:-translate-y-0.5"
            onClick={onClick}
        >
            {getIcon(text)}
            {text}
        </button>
    );
}

export default Button;