import React from 'react'
import { Box, Tooltip, alpha, useTheme } from '@mui/material'
import { NavLink } from 'react-router-dom'
import DashboardIcon from '@mui/icons-material/Dashboard'
import SettingsIcon from '@mui/icons-material/Settings'
import TvIcon from '@mui/icons-material/Tv'

interface NavItem {
  path: string
  icon: React.ReactNode
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { path: '/',       icon: <DashboardIcon />, label: 'Dashboard' },
  { path: '/panel',  icon: <TvIcon />,        label: 'Panel Editor' },
  { path: '/settings', icon: <SettingsIcon />, label: 'Settings' },
]

export const Sidebar: React.FC = () => {
  const theme = useTheme()

  return (
    <Box
      component="nav"
      sx={{
        width: 60,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: 1,
        gap: 0.5,
        background: alpha(theme.palette.background.paper, 0.5),
        borderRight: `1px solid ${theme.palette.divider}`,
        flexShrink: 0,
      }}
    >
      {NAV_ITEMS.map(({ path, icon, label }) => (
        <Tooltip key={path} title={label} placement="right" arrow>
          <Box
            component={NavLink}
            to={path}
            end={path === '/'}
            sx={{
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 2,
              color: 'text.secondary',
              textDecoration: 'none',
              transition: 'all 0.15s',
              '&:hover': {
                background: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.light',
              },
              '&.active': {
                background: alpha(theme.palette.primary.main, 0.15),
                color: 'primary.main',
              },
            }}
          >
            {icon}
          </Box>
        </Tooltip>
      ))}
    </Box>
  )
}
