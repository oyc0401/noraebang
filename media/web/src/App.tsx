import "./tailwind.css";

function App() {
  document.title = "Media - 대시보드";
  return (
    <main className="max-w-5xl p-6 text-gray-950">
      <h1 className="text-2xl font-semibold">JPOP Media</h1>
      <p className="mt-2 text-gray-600">
        YouTube / Spotify 후보 데이터 작업 공간
      </p>

      <section aria-labelledby="api-section-heading" className="mt-7">
        <h2 id="api-section-heading" className="text-lg font-semibold">
          API
        </h2>
        <a
          className="mt-3 inline-block text-sm text-gray-600 underline"
          href="http://localhost:3003/api/docs"
        >
          http://localhost:3003/api/docs
        </a>
      </section>
    </main>
  );
}

export default App;
