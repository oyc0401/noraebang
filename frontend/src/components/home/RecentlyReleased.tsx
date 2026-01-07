export function RecentlyReleased() {
  return (
    <>
      <h3 className="text-white text-lg font-bold leading-tight pb-3">
        최근 나온 곡
      </h3>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4 bg-surface-dark p-3 rounded-xl shadow-sm ring-1 ring-white/5 active:scale-[0.98] transition-transform duration-200 cursor-pointer">
          <img
            alt="Moody dark blue abstract smoke for ballad song cover"
            className="size-14 rounded-lg object-cover bg-gray-800"
            data-alt="Moody dark blue abstract smoke for ballad song cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAdPb069WRktyqTEbgmAtW2eB3-mAhmr74gngfmz0o6YjTvHgLr1BGgJX0pWCSAlcm4EUlNTA3cSZ-gNgGYTmMig2dHR9e30IBBJsadiK50p4ovNqCellfiHL_9bmZxENh2TC2q5vGfSVE61BLWOj4Kq_FPPy7IVJO1YLs99bLDB5QQ3YslnxJ2lGMEi3fS4sUWJhDDIK2zIskBSkQXZfYdulzJsKoH5nKaKYavypZQmNFA0NvE88spY8HCbLqRzOTu32dPFyaE3Bo"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-bold text-sm truncate">
              Love wins all
            </h4>
            <p className="text-gray-400 text-xs truncate mt-0.5">
              아이유 (IU)
            </p>
            <div className="flex gap-2 mt-2">
              <span className="text-[10px] font-medium text-gray-500 flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-blue-500" /> TJ 87291
              </span>
              <span className="text-[10px] font-medium text-gray-500 flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-red-500" /> KY 23190
              </span>
            </div>
          </div>
          <button
            type="button"
            className="size-8 flex items-center justify-center rounded-full bg-white/10 text-gray-400 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-xl">favorite</span>
          </button>
        </div>
        <div className="flex items-center gap-4 bg-surface-dark p-3 rounded-xl shadow-sm ring-1 ring-white/5 active:scale-[0.98] transition-transform duration-200 cursor-pointer">
          <img
            alt="Bright pink and purple gradient for K-pop upbeat song"
            className="size-14 rounded-lg object-cover bg-gray-800"
            data-alt="Bright pink and purple gradient for K-pop upbeat song"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCvIn_1wZNeI3LHiCBkvJSHX7nmgQNBXPBCgT4oBn-A-x10RRxd7e6fhDb2b6LuQB25RtGa91tJN9Dd5cjqBwte_q8jXBX9p-bYmUKt5Fy2nmCPe6EJwSG8afJHYL5L3m0ErT9AkYclx2Ury5_LEIOec4OFI7LjlX3jnPPzWtD-VENeOnkecmozk_0maZm0w9LTPN0b095dq4uQEN0Ogd3XvSKqWxHQwg17Vf6ePn8QiJuRj9rB6DU3gSMzFt3bP8PX-yOYhgyX7vk"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-bold text-sm truncate">
              Super Lady
            </h4>
            <p className="text-gray-400 text-xs truncate mt-0.5">
              (G)I-DLE
            </p>
            <div className="flex gap-2 mt-2">
              <span className="text-[10px] font-medium text-gray-500 flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-blue-500" /> TJ 89122
              </span>
            </div>
          </div>
          <button
            type="button"
            className="size-8 flex items-center justify-center rounded-full bg-white/10 text-gray-400 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-xl">favorite</span>
          </button>
        </div>
      </div>
    </>
  );
}
