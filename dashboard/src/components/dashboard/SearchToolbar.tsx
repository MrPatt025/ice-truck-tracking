'use client'

import React, { memo, useState } from 'react'
import { Search, X } from 'lucide-react'

type SearchToolbarProps = Readonly<{
  className?: string
}>

const SearchToolbar = memo(function SearchToolbar({
  className = '',
}: SearchToolbarProps) {
  const [query, setQuery] = useState('')

  return (
    <form
      data-testid='dashboard-search-toolbar'
      className={`flex items-center gap-2 rounded-xl bg-white/5 ring-1 ring-white/10 px-3 py-2 ${className}`}
      onSubmit={event => {
        event.preventDefault()
      }}
    >
      <Search className='h-4 w-4 text-slate-400' />
      <input
        data-testid='dashboard-search-input'
        type='search'
        placeholder='Search trucks...'
        value={query}
        onChange={event => setQuery(event.target.value)}
        className='w-40 bg-transparent text-sm outline-none placeholder:text-slate-500'
        aria-label='Search trucks'
      />
      {query.length > 0 && (
        <button
          type='button'
          aria-label='Clear search'
          className='rounded-md p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white'
          onClick={() => setQuery('')}
        >
          <X className='h-3.5 w-3.5' />
        </button>
      )}
    </form>
  )
})

SearchToolbar.displayName = 'SearchToolbar'

export default SearchToolbar
