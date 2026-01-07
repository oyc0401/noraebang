export function PopularSongs() {
  return (
    <>
      <h3 className="text-gray-900 dark:text-white text-lg font-bold leading-tight pb-3">
        요즘 인기 있는 곡
      </h3>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-4 py-3 border-b border-gray-100 dark:border-white/5 last:border-0 hover:bg-black/5 dark:hover:bg-white/5 px-2 -mx-2 rounded-lg transition-colors cursor-pointer group">
          <div className="text-lg font-bold w-6 text-center text-primary">
            1
          </div>
          <img
            alt="Abstract vibrant art for pop music"
            className="size-12 rounded-lg object-cover bg-gray-800"
            data-alt="Abstract vibrant art for pop music"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAicKhmAEJRbX5OWpmXAkfP2rNd5bNRpvIXPUqdNpjhPPpJ8BSBluwj3doRiNvdQS9hdfnVJzGUVuOec7ZrPeG3Eyrx4Lswjolp5gam9TheyuNz0upK-MgCMT8yZEvalX5XV5F79Yi4JFBCO5eaBMGHG5Aq5b42KdnM2bbKRvIrErA9w2XrdT27zd_P6JBlw-HJQAaa65mz6di3RtKvVfs2JM5wzkNB0SH176BqoQPFGa9PAapFDGHjSWw5pU0GAgoFuhBWuKpsZ2E"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-gray-900 dark:text-white font-bold text-sm truncate">
              Ditto
            </h4>
            <p className="text-gray-500 dark:text-gray-400 text-xs truncate mt-0.5">
              NewJeans
            </p>
          </div>
          <div className="text-xs font-medium text-gray-400 dark:text-gray-500 flex flex-col items-end gap-1">
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
              TJ 81401
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 py-3 border-b border-gray-100 dark:border-white/5 last:border-0 hover:bg-black/5 dark:hover:bg-white/5 px-2 -mx-2 rounded-lg transition-colors cursor-pointer group">
          <div className="text-lg font-bold w-6 text-center text-gray-900 dark:text-white">
            2
          </div>
          <img
            alt="Neon cityscape representing city pop music"
            className="size-12 rounded-lg object-cover bg-gray-800"
            data-alt="Neon cityscape representing city pop music"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDwnO7hLHrNqIjgllnmtbgM1cJn31DrpomXDF9ZgshGmDP7sikhbaIGxxwi6j8oKhPpwZL3WJ34BjdnDojwGvcLSPzC7LCWH9E8grgZIjJrGKQzhklRwLZRV5UOzO6LnJLv4m9bhDTYEXWOxDaRasUXob3zVjxqnr0m9NGdnHxTjgTjI2YMDTAPDrEONSdz8c7C3_Budj1xiA2z4ZbeoB071yvIX5Sz4LlJ003w8HLc3oIzRTWuUVymhxVFmtRL8hZ9n-HRO8wNub4"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-gray-900 dark:text-white font-bold text-sm truncate">
              밤양갱
            </h4>
            <p className="text-gray-500 dark:text-gray-400 text-xs truncate mt-0.5">
              비비 (BIBI)
            </p>
          </div>
          <div className="text-xs font-medium text-gray-400 dark:text-gray-500 flex flex-col items-end gap-1">
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
              TJ 85023
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 py-3 border-b border-gray-100 dark:border-white/5 last:border-0 hover:bg-black/5 dark:hover:bg-white/5 px-2 -mx-2 rounded-lg transition-colors cursor-pointer group">
          <div className="text-lg font-bold w-6 text-center text-gray-900 dark:text-white">
            3
          </div>
          <img
            alt="Acoustic guitar close up for indie music"
            className="size-12 rounded-lg object-cover bg-gray-800"
            data-alt="Acoustic guitar close up for indie music"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDjNjmyRTBQBtDjDabs_6abciQg3oyrxkyC1GvW1ZkGmElmDc_AIJVyJT-teuJPpR4sxCLYhhfyLrIYjRbKapW079lRMYwsWGeoQXc2nK9PQCBPc1vCnLEbspcOv_1wR1rUziHJ0S8RGMUakiicIghDLTy6VXLUET730Ib-kUKK4Efbg5AcIj2eThWoBOkUmpopaZhrL_kzokwjAOlGFvAsnbySWzV5Fka36GIMzHH2cqUZsTOV0atL2ICt8EMok6ZqTasLJYXEBLU"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-gray-900 dark:text-white font-bold text-sm truncate">
              후라이의 꿈
            </h4>
            <p className="text-gray-500 dark:text-gray-400 text-xs truncate mt-0.5">
              AKMU (악뮤)
            </p>
          </div>
          <div className="text-xs font-medium text-gray-400 dark:text-gray-500 flex flex-col items-end gap-1">
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
              TJ 48291
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
