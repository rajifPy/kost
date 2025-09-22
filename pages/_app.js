// pages/_app.js - Add Error Boundary
import '../styles/globals.css'
import Header from '../components/Header'
import ErrorBoundary from '../components/ErrorBoundary'

function MyApp({ Component, pageProps }){
  return (
    <ErrorBoundary>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Component {...pageProps} />
      </main>
    </ErrorBoundary>
  )
}

export default MyApp
