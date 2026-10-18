import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { Float, Sparkles, Stars, Environment, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import { Heart, Music2, VolumeX, Play, Pause, Sparkles as SparkleIcon, Gift, X, ChevronDown, ArrowLeft, ArrowRight } from 'lucide-react'
import RoseWidget from './RoseWidget'

// ✨ Cá nhân hóa website tại đây
const WIFE_NAME = 'Vợ yêu của anh'
const LOVE_LETTER = `Gửi người con gái anh thương nhất,

Có thể anh không phải lúc nào cũng giỏi nói những lời ngọt ngào, nhưng anh luôn biết mình may mắn thế nào khi có em bên cạnh.

Cảm ơn em vì đã làm những ngày bình thường của anh trở nên đặc biệt, vì những nụ cười, sự dịu dàng và cả những điều nhỏ bé em làm mà có thể em chẳng để ý.

Ngày 20/10, anh mong em luôn được yêu thương, được là chính mình, được vui vẻ và bình yên. Nếu cuộc sống có những ngày không dễ dàng, mong em nhớ rằng em không phải đi qua chúng một mình — anh luôn ở đây, nắm tay em.

Chúc vợ yêu của anh một ngày 20/10 thật rực rỡ. Anh yêu em, hôm nay và cả những ngày sau nữa. ❤️`

const MEMORIES = [
  { date: 'MỘT NGÀY ĐÁNG NHỚ', title: 'Khoảnh khắc của chúng mình', src: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=900&q=85', note: 'Thay ảnh này bằng kỷ niệm thật của hai đứa nhé.' },
  { date: 'NHỮNG ĐIỀU BÌNH DỊ', title: 'Chỉ cần có em', src: 'https://images.unsplash.com/photo-1511988617509-a57c8a288659?auto=format&fit=crop&w=900&q=85', note: 'Những điều giản dị lại là điều anh trân trọng nhất.' },
  { date: 'VẪN LÀ EM', title: 'Người anh chọn', src: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=900&q=85', note: 'Nếu được chọn lại, anh vẫn muốn gặp em.' },
  { date: 'MỘT NGÀY ĐÁNG NHỚ', title: 'Khoảnh khắc của chúng mình', src: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=900&q=85', note: 'Thay ảnh này bằng kỷ niệm thật của hai đứa nhé.' },
  { date: 'NHỮNG ĐIỀU BÌNH DỊ', title: 'Chỉ cần có em', src: 'https://images.unsplash.com/photo-1511988617509-a57c8a288659?auto=format&fit=crop&w=900&q=85', note: 'Những điều giản dị lại là điều anh trân trọng nhất.' },
  { date: 'VẪN LÀ EM', title: 'Người anh chọn', src: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=900&q=85', note: 'Nếu được chọn lại, anh vẫn muốn gặp em.' },
]

function createPetalGeometry(length, width, curl = 0.2, cup = 0.18) {
  const geometry = new THREE.BufferGeometry()
  const positions = [], uvs = [], indices = []
  const rows = 12, cols = 10
  for (let i = 0; i <= rows; i++) {
    const t = i / rows
    for (let j = 0; j <= cols; j++) {
      const u = (j / cols) * 2 - 1
      const w = Math.sin(Math.PI * Math.pow(t, 0.72)) * width * (0.35 + 0.65 * t)
      const x = u * w
      const y = t * length
      const z = cup * (u * u) + curl * t * t + 0.09 * Math.sin(t * Math.PI) * (1 - u * u)
      positions.push(x, y, z)
      uvs.push(j / cols, t)
      if (i < rows && j < cols) {
        const a = i * (cols + 1) + j, b = a + cols + 1
        indices.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function ProceduralRose() {
  const rose = useRef()
  const petals = useMemo(() => {
    const layers = []
    for (let layer = 0; layer < 5; layer++) {
      const count = [5, 7, 9, 10, 8][layer]
      for (let i = 0; i < count; i++) {
        const t = i / count
        const angle = t * Math.PI * 2 + layer * 0.39
        const radius = [0.12, 0.23, 0.34, 0.43, 0.5][layer]
        const length = [0.52, 0.67, 0.78, 0.83, 0.75][layer]
        const width = [0.2, 0.25, 0.28, 0.3, 0.31][layer]
        layers.push({ key: `${layer}-${i}`, angle, radius, length, width, layer, lift: layer * 0.105, curl: 0.12 + layer * 0.045 })
      }
    }
    return layers
  }, [])
  useFrame((state, delta) => {
    if (rose.current) {
      rose.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.25) * 0.16
      rose.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3) * 0.025
    }
  })
  const petalMaterials = ['#8c1644', '#c5225b', '#e83d78', '#f45b91', '#ff83ae']
  return (
    <group ref={rose} position={[0.15, -0.05, -2.15]} rotation={[0.18, 0, -0.12]} scale={1.42}>
      <pointLight position={[0, 1.3, 1]} color="#ff7aa9" intensity={3.5} distance={5} />
      {petals.map((p) => (
        <mesh key={p.key} geometry={createPetalGeometry(p.length, p.width, p.curl, 0.15)}
          position={[Math.cos(p.angle) * p.radius, p.lift - 0.22, Math.sin(p.angle) * p.radius]}
          rotation={[Math.cos(p.angle) * 0.3, -p.angle, Math.sin(p.angle) * 0.23 - 0.08]}
          scale={[1, 1, 1]}>
          <meshPhysicalMaterial color={petalMaterials[p.layer]} roughness={0.3} metalness={0.03} clearcoat={0.7} clearcoatRoughness={0.22} side={THREE.DoubleSide} emissive="#4c0828" emissiveIntensity={0.16} />
        </mesh>
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={`inner-${i}`} geometry={createPetalGeometry(0.45, 0.16, 0.35, 0.13)}
          position={[Math.cos(i * 2.4) * 0.09, 0.12 + (i % 3) * 0.045, Math.sin(i * 2.4) * 0.09]}
          rotation={[0.2, i * 2.4, 0.25]}>
          <meshPhysicalMaterial color={i % 2 ? '#ff8bb2' : '#d92f69'} roughness={0.25} clearcoat={1} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, -0.05, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.26, 0.42, 7]} />
        <meshStandardMaterial color="#315a43" roughness={0.7} />
      </mesh>
      <mesh position={[0, -1.15, -0.08]} rotation={[0, 0, -0.04]}>
        <cylinderGeometry args={[0.045, 0.075, 2.2, 8]} />
        <meshStandardMaterial color="#28583e" roughness={0.58} />
      </mesh>
      {[[-0.28, -0.72, 0.02, -0.65], [0.28, -1.03, 0.02, 0.75], [-0.25, -1.38, 0.02, -0.85]].map((leaf, i) => (
        <group key={`leaf-${i}`} position={[leaf[0], leaf[1], leaf[2]]} rotation={[0, 0, leaf[3]]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <sphereGeometry args={[0.28, 12, 8]} />
            <meshStandardMaterial color="#36734e" roughness={0.48} />
          </mesh>
          <mesh position={[0, 0, 0.08]} rotation={[0, 0, Math.PI / 2]} scale={[0.018, 0.22, 0.018]}>
            <cylinderGeometry args={[1, 1, 1, 5]} />
            <meshStandardMaterial color="#9acb8b" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function FloatingHeartsOverlay() {
  const hearts = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    left: `${(i * 41 + 7) % 100}%`,
    delay: `${-((i * 1.7) % 18)}s`,
    duration: `${13 + (i % 8) * 2}s`,
    size: `${9 + (i % 5) * 5}px`,
    drift: `${((i % 7) - 3) * 24}px`,
    opacity: 0.18 + (i % 4) * 0.08,
  }))
  return <div className="floating-hearts-overlay" aria-hidden="true">{hearts.map(h => <span key={h.id} style={{ left: h.left, animationDelay: h.delay, animationDuration: h.duration, fontSize: h.size, opacity: h.opacity, '--drift': h.drift }}>♥</span>)}</div>
}

function FloatingHearts() {
  const group = useRef()
  const hearts = useRef([])
  const count = typeof window !== 'undefined' && window.innerWidth < 700 ? 15 : 27
  const shape = new THREE.Shape()
  shape.moveTo(0, -0.18)
  shape.bezierCurveTo(-0.08, -0.03, -0.36, 0.12, -0.28, 0.3)
  shape.bezierCurveTo(-0.22, 0.46, -0.06, 0.42, 0, 0.27)
  shape.bezierCurveTo(0.07, 0.43, 0.24, 0.46, 0.3, 0.3)
  shape.bezierCurveTo(0.37, 0.12, 0.08, -0.03, 0, -0.18)
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.018, bevelThickness: 0.018 })
  useFrame((state, delta) => {
    if (!group.current) return
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.12) * 0.08
    hearts.current.forEach((heart, i) => {
      if (!heart) return
      heart.position.y += delta * (0.12 + (i % 5) * 0.025)
      heart.position.x += Math.sin(state.clock.elapsedTime * 0.45 + i * 2.1) * delta * 0.045
      heart.rotation.z = Math.sin(state.clock.elapsedTime * 0.6 + i) * 0.18
      heart.rotation.y += delta * (0.15 + (i % 4) * 0.05)
      if (heart.position.y > 4.2) {
        heart.position.y = -4.2 - (i % 3) * 0.5
        heart.position.x = ((i * 37) % 100) / 12 - 4.1
      }
    })
  })
  return (
    <group ref={group}>
      {Array.from({ length: count }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => { hearts.current[i] = el }}
          geometry={geometry}
          position={[((i * 37) % 100) / 12 - 4.1, ((i * 29) % 80) / 12 - 3.2, -0.1 + (i % 5) * 0.16]}
          rotation={[0, 0, (i % 7) * 0.16]}
          scale={0.22 + (i % 4) * 0.055}
        >
          <meshPhysicalMaterial
            color={i % 3 === 0 ? '#ff8bc8' : i % 3 === 1 ? '#ffc5e4' : '#b9a7ff'}
            emissive="#9e2f75"
            emissiveIntensity={0.35}
            roughness={0.22}
            metalness={0.12}
            transmission={0.22}
            transparent
            opacity={0.78}
            thickness={0.4}
            clearcoat={1}
          />
        </mesh>
      ))}
    </group>
  )
}

function Universe() {
  const group = useRef()
  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = state.pointer.x * 0.12
      group.current.rotation.x = -state.pointer.y * 0.06
    }
  })
  return (
    <group ref={group}>
      <color attach="background" args={['#080816']} />
      <fog attach="fog" args={['#080816', 8, 24]} />
      <ambientLight intensity={0.65} />
      <pointLight position={[2, 3, 4]} intensity={28} color="#ff9ed8" />
      <pointLight position={[-4, -2, -2]} intensity={20} color="#6865ff" />
      <pointLight position={[0, 2, -4]} intensity={14} color="#ff3c89" />
      <Stars radius={70} depth={45} count={1500} factor={3} saturation={0.6} fade speed={0.6} />
      <Sparkles count={typeof window !== 'undefined' && window.innerWidth < 700 ? 55 : 110} scale={[9, 7, 7]} size={2.2} speed={0.25} color="#ffc3e7" />
      <ProceduralRose />
      <FloatingHearts />
      <ContactShadows position={[0, -2.1, 0]} opacity={0.35} scale={8} blur={3} far={4} />
      <Environment preset="night" />
    </group>
  )
}

function MusicButton() {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [hint, setHint] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.play().catch(() => setHint(true))
  }, [])

  const toggle = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }
    try {
      await audio.play()
      setPlaying(true)
      setHint(false)
    } catch {
      setHint(true)
    }
  }
  return (
    <>
      <audio ref={audioRef} src="/audio/love-song.mp3" loop preload="metadata" onEnded={() => setPlaying(false)} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />
      <button className="music-button" onClick={toggle} aria-label={playing ? 'Tạm dừng nhạc' : 'Phát nhạc'}>
        {playing ? <Pause size={17} /> : <Music2 size={17} />}
        <span>{playing ? 'Đang phát' : 'Bật nhạc'}</span>
      </button>
      {hint && <div className="music-hint" role="status">Trình duyệt chưa cho phép tự phát. Chạm “Bật nhạc” để bắt đầu nhé.</div>}
    </>
  )
}

function PhotoModal({ item, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="photo-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={item.title}>
        <button className="icon-button close-modal" onClick={onClose} aria-label="Đóng"><X /></button>
        <img src={item.src} alt={item.title} />
        <div className="modal-copy"><span className="eyebrow">{item.date}</span><h3>{item.title}</h3><p>{item.note}</p></div>
      </div>
    </div>
  )
}

export default function App() {
  const [started, setStarted] = useState(false)
  const [letterOpen, setLetterOpen] = useState(false)
  const [giftOpen, setGiftOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [activeMemory, setActiveMemory] = useState(0)
  const [burst, setBurst] = useState(false)
  const heroRef = useRef(null)
  const letterRef = useRef(null)
  const memoryTouchStart = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo('.hero-kicker', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1, delay: 0.2 })
    gsap.fromTo('.hero-title', { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 1.2, delay: 0.4, ease: 'power3.out' })
    gsap.fromTo('.hero-subtitle', { opacity: 0 }, { opacity: 1, duration: 1, delay: 1 })
    gsap.fromTo('.hero-actions', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.8, delay: 1.2 })
  }, [])

  const beginJourney = () => {
    setStarted(true)
    document.getElementById('story')?.scrollIntoView({ behavior: 'smooth' })
  }
  const openGift = () => {
    setGiftOpen(true)
    setBurst(true)
    window.setTimeout(() => setBurst(false), 1600)
  }
  const openLetter = () => {
    setLetterOpen(true)
    window.setTimeout(() => letterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80)
  }
  const moveMemory = (direction) => {
    setActiveMemory((current) => (current + direction + MEMORIES.length) % MEMORIES.length)
  }
  const finishMemorySwipe = (event) => {
    if (memoryTouchStart.current === null) return
    const distance = event.changedTouches[0].clientX - memoryTouchStart.current
    if (Math.abs(distance) > 45) moveMemory(distance < 0 ? 1 : -1)
    memoryTouchStart.current = null
  }

  return (
    <main>
      <div className="scene">
        {/* <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 5.8], fov: 43 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}>
          <Universe />
        </Canvas>
        <div className="scene-vignette" /> */}
        <RoseWidget height="100vh"/>
      </div>
      <FloatingHeartsOverlay />
      <header className="topbar">
        <a className="brand" href="#home" aria-label="Về đầu trang"><span className="brand-icon"><Heart size={15} fill="currentColor" /></span> FOR MY LOVE <span className="brand-year">20.10</span></a>
        <MusicButton />
      </header>

      <section className="hero" id="home" ref={heroRef}>
        <div className="hero-content">
          <div className="hero-copy">
            <div className="hero-kicker"><span className="tiny-star">✦</span> A LITTLE UNIVERSE, JUST FOR YOU <span className="tiny-star">✦</span></div>
            <h1 className="hero-title">Gửi <span>vũ trụ</span><br />của riêng anh.</h1>
            <p className="hero-subtitle">Giữa hàng tỷ vì sao, anh vẫn luôn tìm về phía em.</p>
          </div>
          <div className="hero-actions">
            <button className="primary-button" onClick={beginJourney}><Heart size={17} fill="currentColor" /> Bắt đầu hành trình <span>↗</span></button>
            <span className="date-note">20 THÁNG 10 <i>·</i> DÀNH RIÊNG CHO EM</span>
          </div>
        </div>
        <div className="hero-bottom"><span>SCROLL TO EXPLORE</span><ChevronDown size={15} className="scroll-chevron" /><span>MADE WITH LOVE ♥</span></div>
      </section>

      <section className="story section-wrap" id="story">
        <div className="section-heading">
          <span className="eyebrow"><SparkleIcon size={13} /> OUR LITTLE UNIVERSE</span>
          <h2>Một thế giới nhỏ,<br /><em>chỉ có anh và em.</em></h2>
          <p>Trong vũ trụ rộng lớn này, điều kỳ diệu nhất không phải một vì sao — mà là ngày anh gặp em.</p>
        </div>
        <div className="promise-grid">
          <article className="promise-card"><span className="card-index">01 / ALWAYS</span><div className="orbit-icon"><Heart /></div><h3>Luôn chọn em</h3><p>Không chỉ hôm nay, mà là trong những ngày bình thường nhất, anh vẫn muốn chọn em.</p></article>
          <article className="promise-card"><span className="card-index">02 / GENTLY</span><div className="orbit-icon flower-icon">✿</div><h3>Thương em dịu dàng</h3><p>Mong em luôn có một nơi bình yên để trở về, được lắng nghe và được yêu thương.</p></article>
          <article className="promise-card"><span className="card-index">03 / FOREVER</span><div className="orbit-icon star-icon">✧</div><h3>Cùng nhau lớn lên</h3><p>Đi qua những mùa vui buồn, mình vẫn nắm tay nhau và cùng viết tiếp câu chuyện.</p></article>
        </div>
      </section>

      <section className="memories section-wrap" id="memories">
        <div className="memories-heading"><div><span className="eyebrow">THE CONSTELLATION OF US</span><h2>Những điều nhỏ bé<br /><em>mà anh luôn nhớ.</em></h2></div><p>Chạm vào từng tấm ảnh để mở một kỷ niệm. Hãy thay bằng ảnh thật của hai đứa để món quà trở nên đặc biệt hơn.</p></div>
        <div className="memory-carousel">
          <div
            className="memory-stage"
            role="region"
            aria-label="Những kỷ niệm của chúng mình"
            tabIndex={0}
            onTouchStart={(event) => { memoryTouchStart.current = event.touches[0].clientX }}
            onTouchEnd={finishMemorySwipe}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft') moveMemory(-1)
              if (event.key === 'ArrowRight') moveMemory(1)
            }}
          >
            {MEMORIES.map((item, index) => {
              const forwardOffset = (index - activeMemory + MEMORIES.length) % MEMORIES.length
              const offset = forwardOffset > MEMORIES.length / 2 ? forwardOffset - MEMORIES.length : forwardOffset
              const position = offset === 0 ? 'is-active' : offset === -1 ? 'is-previous' : offset === 1 ? 'is-next' : 'is-hidden'
              const isActive = position === 'is-active'
              const hiddenTransform = offset < 0
                ? `translateX(calc(-50% - ${Math.abs(offset) * 110}%)) scale(.82)`
                : `translateX(calc(-50% + ${offset * 110}%)) scale(.82)`
              return <button
                className={`memory-card memory-slide ${position}`}
                key={index}
                onClick={() => isActive ? setSelected(item) : setActiveMemory(index)}
                aria-label={isActive ? `Mở kỷ niệm: ${item.title}` : `Chuyển tới kỷ niệm: ${item.title}`}
                aria-hidden={position === 'is-hidden'}
                tabIndex={position === 'is-hidden' ? -1 : 0}
                style={position === 'is-hidden' ? { transform: hiddenTransform } : undefined}
              >
                <img src={item.src} alt={item.title} loading="lazy" />
                <span className="memory-shade" />
                <span className="memory-number">{String(index + 1).padStart(2, '0')} <i>/ {String(MEMORIES.length).padStart(2, '0')}</i></span>
                <span className="memory-caption"><small>{item.date}</small><strong>{item.title}</strong><span className="memory-open">{isActive ? 'Mở kỷ niệm ↗' : 'Xem tiếp →'}</span></span>
              </button>
            })}
          </div>
          <div className="memory-controls">
            <button className="memory-nav" onClick={() => moveMemory(-1)} aria-label="Kỷ niệm trước"><ArrowLeft size={18} /></button>
            <div className="memory-pagination" aria-live="polite">
              <span>{String(activeMemory + 1).padStart(2, '0')}</span>
              <div className="memory-progress"><span style={{ width: `${((activeMemory + 1) / MEMORIES.length) * 100}%` }} /></div>
              <span>{String(MEMORIES.length).padStart(2, '0')}</span>
            </div>
            <button className="memory-nav" onClick={() => moveMemory(1)} aria-label="Kỷ niệm tiếp theo"><ArrowRight size={18} /></button>
          </div>
        </div>
      </section>

      <section className="letter-section section-wrap" ref={letterRef}>
        <div className="letter-glow"><div className="letter-orbit orbit-one" /><div className="letter-orbit orbit-two" /><div className="letter-heart"><Heart fill="currentColor" /></div></div>
        <div className="letter-content">
          <span className="eyebrow">A LETTER FROM MY HEART</span>
          <h2>Có vài điều,<br /><em>anh muốn nói với em.</em></h2>
          <p>Những lời yêu thương đôi khi khó nói thành lời. Hôm nay, anh viết chúng ở đây — dành riêng cho em.</p>
          <button className="primary-button" onClick={openLetter}><span>Đọc thư tình của anh</span><span>♡</span></button>
        </div>
        {letterOpen && <div className="letter-paper" id="love-letter">
          <div className="paper-top"><span>GỬI NGƯỜI ANH YÊU</span><Heart size={17} fill="currentColor" /></div>
          <h3>{WIFE_NAME} à,</h3>
          {LOVE_LETTER.split('\n\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
          <div className="signature">Mãi thương em, <span>chồng của em ♥</span></div>
          <button className="text-button" onClick={() => setLetterOpen(false)}>Gấp lá thư lại ↑</button>
        </div>}
      </section>

      <section className="gift-section section-wrap">
        <div className={`gift-orb ${giftOpen ? 'gift-opened' : ''} ${burst ? 'gift-burst' : ''}`}>
          <div className="gift-halo" /><div className="gift-box"><div className="gift-lid"><span /></div><div className="gift-base"><span className="gift-ribbon" /></div></div>
          <div className="gift-spark gift-spark-1">✦</div><div className="gift-spark gift-spark-2">✧</div><div className="gift-spark gift-spark-3">✦</div>
        </div>
        <span className="eyebrow">ONE LAST LITTLE SURPRISE</span>
        <h2>Món quà này<br /><em>chỉ dành cho em.</em></h2>
        <p>Anh có một điều bí mật muốn gửi đến người con gái đặc biệt nhất của anh.</p>
        <button className="primary-button gift-button" onClick={openGift}><Gift size={17} /> {giftOpen ? 'Mở lại món quà' : 'Mở món quà bí mật'} <span>♡</span></button>
        {giftOpen && <div className="gift-message" role="status"><div className="gift-message-icon"><Heart fill="currentColor" /></div><span className="eyebrow">MY FAVORITE PERSON</span><h3>Chúc mừng 20/10, {WIFE_NAME}!</h3><p>Chúc em luôn xinh đẹp theo cách của riêng mình, luôn có thật nhiều niềm vui và luôn cảm nhận được rằng em được yêu thương. Cảm ơn em đã là một phần tuyệt đẹp trong cuộc đời anh.</p><strong>Anh yêu em nhiều hơn những vì sao có thể đếm. ❤️</strong></div>}
      </section>

      <footer className="footer"><div className="footer-heart"><Heart fill="currentColor" size={15} /></div><p>Made for one girl, in a universe of billions.</p><span>20 · 10 <i>—</i> FOREVER YOURS</span><a href="#home" className="back-top">Về đầu trang ↑</a></footer>
      {selected && <PhotoModal item={selected} onClose={() => setSelected(null)} />}
    </main>
  )
}
