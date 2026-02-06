'use client'
import {fetchAllNominations} from "../../../shared/api/nominations.api";
import useSWR from "swr";
import NominationForm from "../../../features/nomination/ui/nomination-form";

const NominationsEdit = () => {
    const {data: nominations, isLoading, error, mutate} = useSWR('nominations', fetchAllNominations)

    if (!nominations || isLoading || error) return '...'

    const deleteNomination = (id) => {
        mutate(nominations.filter((_id) => _id !== id), {
            revalidate: false
        })
    }

    return (
        <ul className={'flex flex-col gap-8 px-8 pt-4'}>
            {nominations.map(nomination => (
                <NominationForm
                    key={nomination._id}
                    type={'update'}
                    nomination={nomination}
                    onDelete={deleteNomination}
                />
            ))}
        </ul>
    );
};

export default NominationsEdit;
