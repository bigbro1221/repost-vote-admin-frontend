'use client'
import {deleteCandidate} from "@/shared/api/candidates.api";
import Link from "next/link";

const CandidateItem = ({candidate, onDelete}) => {
    const remove = async () => {
        const response = await deleteCandidate(candidate._id)

        response._id && onDelete?.(candidate._id)
    }

    return (
        <li className={'flex items-center justify-between shadow py-2 px-4'}>
            <div>
                {`${candidate.ru.name} | ${candidate.uz.name}`}
            </div>
            <div className={'flex items-center gap-3 text-sm'}>
                <Link href={`/candidate/edit/${candidate._id}`} className={'text-white bg-blue-600 rounded px-4 py-2'}>
                    Редактировать
                </Link>

                <button onClick={remove} className={'bg-rose-600 rounded px-4 py-2'}>
                    Удалить
                </button>

            </div>
        </li>
    );
};

export default CandidateItem;
