import { Search } from 'lucide-react-native';
import React from 'react';
import { TextInput, View } from 'react-native';


interface Props {
    onPress: () => void;
    placeholder: string;
}
const SearchBar = ({ onPress, placeholder }: Props) => {
    return (
        <View className='flex-row items-center px-5 py-4 rounded-full bg-dark-300'>
            <Search size={20} color="#ab8bff" />
            <TextInput
                onPress={onPress}
                placeholder={placeholder}
                value=''
                onChange={() => { }}
                placeholderTextColor="#ab8bff"
                className='flex-1 ml-2 text-white'
            />

        </View>
    )
}

export default SearchBar