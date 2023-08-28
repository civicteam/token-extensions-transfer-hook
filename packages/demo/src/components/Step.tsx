import {FC, PropsWithChildren} from "react";
import {FaCircleCheck} from "react-icons/fa6";
import clsx from "clsx";

type Props = PropsWithChildren<{
    title: string
    description: string
    done: boolean
    focus: boolean
}>;
export const Step:FC<Props> = ({ children, title, description, done, focus }) => {

    return (
        <div className={clsx(
            "card card-compact w-96 h-48 shadow-xl items-center m-6 p-2",
            { "border-2 border-blue-500 bg-neutral-focus": focus},
            { "bg-neutral opacity-50": !focus },
            { "border-2 border-green-800 bg-green-100 opacity-50": done},
            )}>
            <div className="text-center pb-4">
                {title}
            </div>
            <div>
                {description}
            </div>
            <div>
                {children}
            </div>
        </div>
    );
}