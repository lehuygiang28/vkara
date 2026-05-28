import { create } from 'zustand';

interface RoomSettingsState {
    roomPassword: string;
    joinRoomId: string;
    joinRoomPassword: string;
    showJoinPassword: boolean;
    showCreatePassword: boolean;
    showCreateRoom: boolean;
    showJoinRoom: boolean;
    showPassword: boolean;
    setRoomPassword: (password: string) => void;
    setJoinRoomId: (id: string) => void;
    setJoinRoomPassword: (password: string) => void;
    setShowJoinPassword: (show: boolean) => void;
    setShowCreatePassword: (show: boolean) => void;
    setShowCreateRoom: (show: boolean) => void;
    setShowJoinRoom: (show: boolean) => void;
    setShowPassword: (show: boolean) => void;
    resetState: () => void;
}

export const useRoomSettingsStore = create<RoomSettingsState>((set) => ({
    roomPassword: '',
    joinRoomId: '',
    joinRoomPassword: '',
    showJoinPassword: false,
    showCreatePassword: false,
    showCreateRoom: false,
    showJoinRoom: false,
    showPassword: false,
    setRoomPassword: (password) => set({ roomPassword: password }),
    setJoinRoomId: (id) => set({ joinRoomId: id }),
    setJoinRoomPassword: (password) => set({ joinRoomPassword: password }),
    setShowJoinPassword: (show) => set({ showJoinPassword: show }),
    setShowCreatePassword: (show) => set({ showCreatePassword: show }),
    setShowCreateRoom: (show) => set({ showCreateRoom: show }),
    setShowJoinRoom: (show) => set({ showJoinRoom: show }),
    setShowPassword: (show) => set({ showPassword: show }),
    resetState: () =>
        set({
            roomPassword: '',
            joinRoomId: '',
            joinRoomPassword: '',
            showJoinPassword: false,
            showCreatePassword: false,
            showCreateRoom: false,
            showJoinRoom: false,
            showPassword: false,
        }),
}));
