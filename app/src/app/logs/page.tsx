"use client"

import React, { useEffect } from 'react'

export default function Logs() {
  useEffect(() => {
    console.log('hi')
  }, [])
  
  return (
    <div>
      hello
    </div>
  )
}