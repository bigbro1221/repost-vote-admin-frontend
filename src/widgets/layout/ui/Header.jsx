'use client';

import classNames from "classnames";
import HeaderLinks from "./HeaderLinks";

const Header = () => {
    return (
        <nav className="bg-gray-950">
            <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
                <p
                    className={classNames([
                        'self-center text-2xl font-semibold',
                        'flex items-center whitespace-nowrap text-white'
                    ])}
                >
                    Repost Vote Admin
                </p>

                <HeaderLinks />
            </div>
        </nav>
    );
};

export default Header;
