// Device Detection Utility
// ใช้สำหรับ detect ข้อมูลอุปกรณ์จาก User-Agent string

function parseUserAgent(userAgent) {
    const ua = userAgent || '';
    
    // Detect Device Type & Name
    let deviceType = 'Desktop';
    let deviceName = 'Unknown Device';
    
    // Mobile Devices
    if (/iPhone/.test(ua)) {
        deviceType = 'Mobile';
        // Extract iPhone model
        if (/iPhone OS 18/.test(ua)) deviceName = 'iPhone (iOS 18)';
        else if (/iPhone OS 17/.test(ua)) deviceName = 'iPhone (iOS 17)';
        else if (/iPhone OS 16/.test(ua)) deviceName = 'iPhone (iOS 16)';
        else deviceName = 'iPhone';
    } else if (/iPad/.test(ua)) {
        deviceType = 'Tablet';
        if (/iPad.*OS 18/.test(ua)) deviceName = 'iPad (iPadOS 18)';
        else if (/iPad.*OS 17/.test(ua)) deviceName = 'iPad (iPadOS 17)';
        else deviceName = 'iPad';
    } else if (/Android/.test(ua)) {
        if (/Mobile/.test(ua)) {
            deviceType = 'Mobile';
            // Try to extract brand
            if (/Samsung/.test(ua)) deviceName = 'Samsung Phone';
            else if (/Huawei/.test(ua)) deviceName = 'Huawei Phone';
            else if (/Xiaomi/.test(ua)) deviceName = 'Xiaomi Phone';
            else deviceName = 'Android Phone';
        } else {
            deviceType = 'Tablet';
            deviceName = 'Android Tablet';
        }
    }
    
    // Desktop Devices
    if (/Macintosh/.test(ua) || /Mac OS X/.test(ua)) {
        deviceType = 'Desktop';
        if (/MacBook/.test(ua)) deviceName = 'MacBook';
        else deviceName = 'Mac';
    } else if (/Windows NT/.test(ua)) {
        deviceType = 'Desktop';
        if (/Windows NT 10/.test(ua)) deviceName = 'Windows 10/11 PC';
        else if (/Windows NT 6/.test(ua)) deviceName = 'Windows 7/8 PC';
        else deviceName = 'Windows PC';
    } else if (/Linux/.test(ua) && !/Android/.test(ua)) {
        deviceType = 'Desktop';
        deviceName = 'Linux PC';
    }
    
    // Detect Browser
    let browser = 'Unknown';
    let browserVersion = '';
    
    if (/Edg\//.test(ua)) {
        browser = 'Microsoft Edge';
        const match = ua.match(/Edg\/([\d.]+)/);
        browserVersion = match ? match[1] : '';
    } else if (/Chrome\//.test(ua) && !/Edg/.test(ua)) {
        browser = 'Google Chrome';
        const match = ua.match(/Chrome\/([\d.]+)/);
        browserVersion = match ? match[1] : '';
    } else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) {
        browser = 'Safari';
        const match = ua.match(/Version\/([\d.]+)/);
        browserVersion = match ? match[1] : '';
    } else if (/Firefox\//.test(ua)) {
        browser = 'Mozilla Firefox';
        const match = ua.match(/Firefox\/([\d.]+)/);
        browserVersion = match ? match[1] : '';
    } else if (/Opera/.test(ua) || /OPR\//.test(ua)) {
        browser = 'Opera';
        const match = ua.match(/OPR\/([\d.]+)/);
        browserVersion = match ? match[1] : '';
    }
    
    // Detect OS
    let os = 'Unknown OS';
    
    if (/iPhone OS ([\d_]+)/.test(ua)) {
        const match = ua.match(/iPhone OS ([\d_]+)/);
        const version = match ? match[1].replace(/_/g, '.') : '';
        os = `iOS ${version}`;
    } else if (/iPad.*OS ([\d_]+)/.test(ua)) {
        const match = ua.match(/OS ([\d_]+)/);
        const version = match ? match[1].replace(/_/g, '.') : '';
        os = `iPadOS ${version}`;
    } else if (/Mac OS X ([\d_]+)/.test(ua)) {
        const match = ua.match(/Mac OS X ([\d_]+)/);
        const version = match ? match[1].replace(/_/g, '.') : '';
        os = `macOS ${version}`;
    } else if (/Android ([\d.]+)/.test(ua)) {
        const match = ua.match(/Android ([\d.]+)/);
        const version = match ? match[1] : '';
        os = `Android ${version}`;
    } else if (/Windows NT ([\d.]+)/.test(ua)) {
        const match = ua.match(/Windows NT ([\d.]+)/);
        const ntVersion = match ? match[1] : '';
        if (ntVersion === '10.0') os = 'Windows 10/11';
        else if (ntVersion === '6.3') os = 'Windows 8.1';
        else if (ntVersion === '6.2') os = 'Windows 8';
        else if (ntVersion === '6.1') os = 'Windows 7';
        else os = `Windows NT ${ntVersion}`;
    } else if (/Linux/.test(ua) && !/Android/.test(ua)) {
        os = 'Linux';
    }
    
    return {
        deviceType,
        deviceName,
        browser,
        browserVersion,
        os,
        userAgent: ua
    };
}

// Get IP Address from request
function getClientIP(req) {
    // Check various headers for real IP
    return req.headers['x-forwarded-for']?.split(',')[0] || 
           req.headers['x-real-ip'] || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           'Unknown';
}

module.exports = {
    parseUserAgent,
    getClientIP
};
