package net.xstat.companion

internal object BeaconProtocol {
    fun parsePort(data: ByteArray, offset: Int = 0, length: Int = data.size): Int? {
        if (offset < 0 || length !in 1..64 || offset > data.size - length) return null
        val message = String(data, offset, length, Charsets.US_ASCII).trim()
        if (!message.startsWith("XSTAT_HERE:")) return null
        val value = message.removePrefix("XSTAT_HERE:").trim()
        if (value.isEmpty() || value.any { it !in '0'..'9' }) return null
        return value.toIntOrNull()?.takeIf { it in 1..65535 }
    }
}
