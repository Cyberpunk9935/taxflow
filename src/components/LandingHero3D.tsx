import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const LandingHero3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Check prefers-reduced-motion or mobile
    const isMobile = window.innerWidth < 768;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 18;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Ambient and Point lights with Ledger warm paper and brass ink theme
    const ambientLight = new THREE.AmbientLight(0xF7F4EC, 3.2);
    scene.add(ambientLight);

    const warmBrassLight = new THREE.PointLight(0xD4AF37, 3.5, 50);
    warmBrassLight.position.set(10, 10, 15);
    scene.add(warmBrassLight);

    const inkFillLight = new THREE.PointLight(0x8C7A6B, 2.0, 50);
    inkFillLight.position.set(-10, -8, 12);
    scene.add(inkFillLight);

    // Group for objects
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // 1. Center Emblem / Seal (Solid Ink & Brass Geometry)
    const shieldGeo = new THREE.IcosahedronGeometry(3.2, 1);
    const shieldMat = new THREE.MeshPhysicalMaterial({
      color: 0x1B2430,
      emissive: 0x101720,
      roughness: 0.35,
      metalness: 0.65,
      clearcoat: 0.4,
      clearcoatRoughness: 0.2,
      wireframe: false,
    });
    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    mainGroup.add(shield);

    // Outer warm antique brass wireframe ring
    const ringGeo = new THREE.TorusGeometry(4.8, 0.08, 16, 100);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xC5A059,
      emissive: 0x8C6D23,
      emissiveIntensity: 0.35,
      roughness: 0.3,
      metalness: 0.85,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 4;
    mainGroup.add(ring);

    // 2. Floating Minted Brass / Gold Ledger Coins
    const coinGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.15, 32);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xD4AF37,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x997517,
      emissiveIntensity: 0.2,
    });

    const coins: THREE.Mesh[] = [];
    const coinOffsets = [
      { x: -6, y: 3.5, z: 2, rx: 0.5, ry: 0.8 },
      { x: 6.5, y: -2.8, z: 3, rx: 1.2, ry: 0.4 },
      { x: -5.2, y: -4.2, z: 1.5, rx: 0.8, ry: 1.1 },
      { x: 5.8, y: 4.2, z: -1, rx: 0.3, ry: 0.9 },
    ];

    coinOffsets.forEach((pos) => {
      const coin = new THREE.Mesh(coinGeo, coinMat);
      coin.position.set(pos.x, pos.y, pos.z);
      coin.rotation.set(pos.rx, pos.ry, 0);
      mainGroup.add(coin);
      coins.push(coin);
    });

    // 3. Floating Solid Parchment Ledger Sheets (thick ivory paper)
    const sheetGeo = new THREE.BoxGeometry(2.5, 3.4, 0.04);
    const sheetMat = new THREE.MeshStandardMaterial({
      color: 0xFAF6EE,
      roughness: 0.7,
      metalness: 0.05,
      opacity: 0.95,
      transparent: true,
      wireframe: false,
    });

    const sheets: THREE.Mesh[] = [];
    const sheetOffsets = [
      { x: 5.2, y: 1.2, z: 1, rx: 0.2, ry: -0.6, rz: 0.3 },
      { x: -5.5, y: -0.5, z: 2.2, rx: -0.3, ry: 0.5, rz: -0.2 },
    ];

    sheetOffsets.forEach((pos) => {
      const sheet = new THREE.Mesh(sheetGeo, sheetMat);
      sheet.position.set(pos.x, pos.y, pos.z);
      sheet.rotation.set(pos.rx, pos.ry, pos.rz);
      mainGroup.add(sheet);
      sheets.push(sheet);
    });

    // Mouse parallax tracking
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / width - 0.5;
      const y = (e.clientY - rect.top) / height - 0.5;
      targetX = x * 1.5;
      targetY = y * 1.5;
    };

    window.addEventListener('mousemove', onMouseMove);

    // Resize handler
    const onResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', onResize);

    // Animation loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth parallax interpolation
      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;

      mainGroup.rotation.y = mouseX + elapsed * 0.15;
      mainGroup.rotation.x = mouseY + Math.sin(elapsed * 0.3) * 0.08;

      shield.rotation.y = elapsed * 0.2;
      shield.rotation.z = Math.sin(elapsed * 0.5) * 0.1;

      ring.rotation.z = -elapsed * 0.3;
      ring.rotation.y = Math.cos(elapsed * 0.4) * 0.2;

      // Float coins
      coins.forEach((c, i) => {
        c.rotation.x += 0.015 * (i % 2 === 0 ? 1 : -1);
        c.rotation.y += 0.02;
        c.position.y += Math.sin(elapsed * 1.5 + i) * 0.005;
      });

      // Float ledger sheets
      sheets.forEach((s, i) => {
        s.rotation.z += 0.005 * (i === 0 ? 1 : -1);
        s.position.y += Math.cos(elapsed * 1.2 + i) * 0.006;
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center opacity-85"
      aria-hidden="true"
    />
  );
};
