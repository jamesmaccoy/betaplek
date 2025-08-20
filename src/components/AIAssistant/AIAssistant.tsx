'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bot, Send, X, Mic, MicOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: (event: SpeechRecognitionEvent) => void
  onend: () => void
  onerror: (event: any) => void
  start: () => void
  stop: () => void
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface PackageSuggestion {
  revenueCatId: string
  suggestedName: string
  description: string
  details: {
    minNights?: number
    maxNights?: number
    multiplier?: number
    category?: string
    customerTierRequired?: string
    features?: string
  }
}

const LoadingDots = () => {
  return (
    <div className="flex space-x-1 items-center">
      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
    </div>
  )
}

export const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const [packageSuggestions, setPackageSuggestions] = useState<PackageSuggestion[]>([])
  const [currentContext, setCurrentContext] = useState<any>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const isProcessingRef = useRef(false)
  const finalTranscriptRef = useRef('')

  useEffect(() => {
    // Listen for custom events to open AI Assistant with context
    const handleOpenAIAssistant = (event: CustomEvent) => {
      setIsOpen(true)
      setCurrentContext(event.detail)
      
      // If there's a predefined message, send it automatically
      if (event.detail?.message) {
        setInput(event.detail.message)
        // Auto-send after a brief delay
        setTimeout(() => {
          handleSubmit(new Event('submit') as any)
        }, 100)
      }
    }

    window.addEventListener('openAIAssistant', handleOpenAIAssistant as EventListener)
    
    return () => {
      window.removeEventListener('openAIAssistant', handleOpenAIAssistant as EventListener)
    }
  }, [])

  useEffect(() => {
    // Initialize speech recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        try {
          recognitionRef.current = new SpeechRecognition()
          recognitionRef.current.continuous = true // Enable continuous recognition
          recognitionRef.current.interimResults = true // Get interim results
          recognitionRef.current.lang = 'en-US'

          recognitionRef.current.onresult = async (event: SpeechRecognitionEvent) => {
            let interimTranscript = ''
            let finalTranscript = ''

            for (let i = event.resultIndex; i < event.results.length; i++) {
              const result = event.results[i]
              if (result && result[0]) {
                const transcript = result[0].transcript
                if (result.isFinal) {
                  finalTranscript += transcript
                } else {
                  interimTranscript += transcript
                }
              }
            }

            // Update input with interim results
            setInput(interimTranscript || finalTranscript)

            // If we have a final transcript and we're not already processing
            if (finalTranscript && !isProcessingRef.current) {
              isProcessingRef.current = true
              finalTranscriptRef.current = finalTranscript
              await handleSubmit(new Event('submit') as any)
              isProcessingRef.current = false
            }
          }

          recognitionRef.current.onend = () => {
            if (isListening) {
              // Restart recognition if we're still supposed to be listening
              try {
                recognitionRef.current?.start()
              } catch (error) {
                console.error('Error restarting speech recognition:', error)
                setIsListening(false)
                setMicError('Error with speech recognition. Please try again.')
              }
            }
          }

          recognitionRef.current.onerror = (event) => {
            console.error('Speech recognition error:', event)
            setMicError('Error with speech recognition. Please try again.')
            setIsListening(false)
          }
        } catch (error) {
          console.error('Error initializing speech recognition:', error)
          setMicError('Speech recognition is not supported in your browser.')
        }
      } else {
        setMicError('Speech recognition is not supported in your browser.')
      }
    }

    // Initialize speech synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (synthRef.current) {
        synthRef.current.cancel()
      }
    }
  }, [])

  const startListening = () => {
    if (!recognitionRef.current) {
      setMicError('Speech recognition is not available.')
      return
    }

    try {
      setMicError(null)
      finalTranscriptRef.current = ''
      recognitionRef.current.start()
      setIsListening(true)
    } catch (error) {
      console.error('Error starting speech recognition:', error)
      setMicError('Failed to start speech recognition. Please try again.')
      setIsListening(false)
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
        setIsListening(false)
      } catch (error) {
        console.error('Error stopping speech recognition:', error)
        setMicError('Error stopping speech recognition.')
      }
    }
  }

  const speak = (text: string) => {
    if (synthRef.current) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => {
        setIsSpeaking(false)
        // If we're still listening, restart recognition after speaking
        if (isListening && recognitionRef.current) {
          try {
            recognitionRef.current.start()
          } catch (error) {
            console.error('Error restarting speech recognition after speaking:', error)
          }
        }
      }
      synthRef.current.speak(utterance)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const messageToSend = finalTranscriptRef.current || input
    if (!messageToSend.trim()) return

    const userMessage: Message = { role: 'user', content: messageToSend }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    finalTranscriptRef.current = ''
    setIsLoading(true)

    try {
      // Check if this is a package suggestion request
      if (currentContext?.context === 'package-suggestions' || 
          messageToSend.toLowerCase().includes('package') || 
          messageToSend.toLowerCase().includes('suggest')) {
        
        // Call package suggestions API
        const res = await fetch('/api/packages/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            description: messageToSend, 
            postId: currentContext?.postId,
            hostContext: true 
          }),
        })
        
        if (res.ok) {
          const data = await res.json()
          const suggestions: PackageSuggestion[] = Array.isArray(data.recommendations) ? data.recommendations : []
          
          if (suggestions.length > 0) {
            setPackageSuggestions(suggestions)
            
            // Create a formatted response
            const suggestionText = suggestions.map(s => 
              `**${s.suggestedName}**\n` +
              `${s.description}\n` +
              `- Duration: ${s.details.minNights}-${s.details.maxNights} nights\n` +
              `- Category: ${s.details.category}\n` +
              `- Multiplier: ${s.details.multiplier}x\n` +
              `- Entitlement: ${s.details.customerTierRequired}\n` +
              `- Features: ${s.details.features || 'Standard features'}`
            ).join('\n\n')
            
            const assistantMessage: Message = { 
              role: 'assistant', 
              content: `Here are some package suggestions based on your needs:\n\n${suggestionText}\n\nYou can click "Add Package" on any of these suggestions to create them.` 
            }
            setMessages((prev) => [...prev, assistantMessage])
            speak('I found some package suggestions for you. Check the cards below.')
          } else {
            const assistantMessage: Message = { 
              role: 'assistant', 
              content: "I couldn't find specific package suggestions for your request. Try describing what type of packages you need, such as 'weekly stays', 'luxury options', or 'gathering packages'." 
            }
            setMessages((prev) => [...prev, assistantMessage])
            speak("I couldn't find specific package suggestions. Try being more specific about what you need.")
          }
        } else {
          throw new Error('Failed to get package suggestions')
        }
      } else {
        // Regular chat API call
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: messageToSend }),
        })

        const data = await response.json()
        const assistantMessage: Message = { role: 'assistant', content: data.message }
        setMessages((prev) => [...prev, assistantMessage])
        speak(data.message)
      }
    } catch (error) {
      console.error('Error:', error)
      const errorMessage = 'Sorry, I encountered an error. Please try again.'
      setMessages((prev) => [...prev, { role: 'assistant', content: errorMessage }])
      speak(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'rounded-full w-12 h-12 p-0',
          isOpen ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90',
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </Button>

      {isOpen && (
        <Card className="absolute bottom-16 right-0 w-[400px] shadow-lg">
          <div className="p-4 border-b">
            <h3 className="font-semibold">AI Assistant</h3>
            {currentContext?.context === 'package-suggestions' && (
              <p className="text-xs text-muted-foreground">Package suggestions mode</p>
            )}
          </div>
          
          <ScrollArea ref={scrollRef} className="h-[300px] p-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  'mb-4 p-3 rounded-lg break-words max-w-[85%]',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground ml-auto'
                    : 'bg-muted',
                )}
              >
                <p
                  className="text-sm"
                  dangerouslySetInnerHTML={{ __html: message.content.replace(/\n/g, '<br />') }}
                />
              </div>
            ))}
            {isLoading && (
              <div className="flex w-fit max-w-[85%] rounded-lg bg-muted px-4 py-2">
                <LoadingDots />
              </div>
            )}
          </ScrollArea>
          
          {/* Package Suggestions Display */}
          {packageSuggestions.length > 0 && (
            <div className="border-t p-4 max-h-[200px] overflow-y-auto">
              <h4 className="font-medium text-sm mb-2">Suggested Packages:</h4>
              <div className="space-y-2">
                {packageSuggestions.map((suggestion, index) => (
                  <div key={index} className="text-xs bg-muted p-2 rounded">
                    <div className="font-medium">{suggestion.suggestedName}</div>
                    <div className="text-muted-foreground">{suggestion.description}</div>
                    <div className="mt-1 text-xs">
                      {suggestion.details.minNights}-{suggestion.details.maxNights} nights • {suggestion.details.category} • {suggestion.details.multiplier}x
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="border-t p-4">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "I'm listening..." : 'Type your message...'}
                className="flex-1"
                disabled={isLoading || isListening}
              />
              <Button
                type="button"
                size="icon"
                variant={isListening ? 'destructive' : 'outline'}
                onClick={isListening ? stopListening : startListening}
                disabled={isLoading || isSpeaking || !!micError}
                title={micError || (isListening ? 'Stop listening' : 'Start listening')}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button type="submit" size="icon" disabled={isLoading || isListening}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {micError && <p className="text-sm text-destructive mt-2">{micError}</p>}
          </form>
        </Card>
      )}
    </div>
  )
}
