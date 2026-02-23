import { ImgHTMLAttributes } from 'react';

export default function ApplicationLogo(props: ImgHTMLAttributes<HTMLImageElement>) {
    return <img src="/brand/monsterindex-mark.svg" alt="MonsterIndex" {...props} />;
}
