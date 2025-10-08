// pages/index.js

export default function Home() {
  return (
    <div>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Preusmeri odmah na /chat sa parametrom restorana
            window.location.href = '/chat?restaurant=TableMind Bistro';
          `,
        }}
      />
      <p>Preusmeravanje...</p>
    </div>
  );
}
