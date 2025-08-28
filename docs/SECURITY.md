# 🔒 Security Guidelines for Agent Chaos Monkey

## Current Security Model

### API Key Handling
- **Client-Side Only**: API keys never leave your browser or reach our servers
- **Direct Connections**: Your browser connects directly to OpenAI/custom APIs
- **No Persistence**: Keys are cleared on page refresh
- **Password Input**: Keys are masked in the UI

### Data Flow
```
Browser -> OpenAI API (Direct)
Browser -> Custom Agent (Direct)  
Browser -> Mock Agent (localhost:9009)
```

**Our servers never see your API keys or prompts.**

## ⚠️ Security Considerations

### Browser-Based Risks
1. **Developer Tools**: Keys visible in browser console/network tab
2. **Shared Computers**: Keys remain in memory until page refresh
3. **XSS Attacks**: Malicious scripts could theoretically access keys
4. **Browser Extensions**: Some extensions can read page content

### Recommended Safety Practices

#### For Testing/Development
- ✅ Use dedicated test API keys with low limits
- ✅ Test on local/private networks when possible
- ✅ Clear browser data after testing
- ✅ Use the mock agent when possible (no API key needed)

#### For Production/Sensitive Use
- 🚫 **Don't use production API keys in the browser**
- ✅ Implement server-side proxy with your own auth
- ✅ Use API key rotation strategies
- ✅ Monitor API usage for anomalies

## 🛠️ Secure Deployment Options

### Option 1: Mock Agent Only (Most Secure)
```bash
# No external API keys needed
npm run dev:node
# Use "Mock Agent (localhost:9009)" in UI
```

### Option 2: Server-Side Proxy (Recommended for Production)
```javascript
// Your secure server
app.post('/api/llm-proxy', authenticate, async (req, res) => {
  // Use YOUR API key server-side
  const response = await openai.completions.create({
    model: 'gpt-4',
    messages: req.body.messages
  });
  res.json(response);
});

// In the chaos testing UI:
// Select "Custom HTTP Endpoint"
// Use: https://your-secure-server.com/api/llm-proxy
```

### Option 3: Environment Variables (Development)
```bash
# Set in your environment
export OPENAI_API_KEY=sk-...

# Modify the adapter to read from server-side
# (Requires backend modification)
```

## 🎯 Best Practices

### Development Testing
1. **Create Test Keys**: Use OpenAI's test keys with low limits
2. **Local Testing**: Run on localhost, not public networks
3. **Key Rotation**: Rotate test keys regularly
4. **Monitor Usage**: Watch for unexpected API calls

### Production Deployment
1. **Server-Side Proxy**: Never expose real API keys to browsers
2. **Authentication**: Require user auth before accessing chaos testing
3. **Rate Limiting**: Implement your own rate limits
4. **Audit Logging**: Log all API usage for monitoring

## 🚨 If Your API Key is Compromised

### Immediate Actions
1. **Revoke Key**: Delete the compromised key immediately
2. **Check Usage**: Review API usage logs for unauthorized calls
3. **Create New Key**: Generate a fresh API key
4. **Update Limits**: Set strict usage limits on new keys

### OpenAI Specific
```bash
# Check usage at: https://platform.openai.com/usage
# Revoke keys at: https://platform.openai.com/api-keys
# Set limits at: https://platform.openai.com/settings/limits
```

## 🔐 Advanced Security Measures

### Content Security Policy (CSP)
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               connect-src 'self' https://api.openai.com https://localhost:9009;">
```

### HTTPS Only
```javascript
// Enforce HTTPS in production
if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
  location.replace(`https:${location.href.substring(location.protocol.length)}`);
}
```

### Key Obfuscation
```javascript
// Simple client-side obfuscation (not cryptographically secure)
function obfuscateKey(key) {
  return btoa(key).split('').reverse().join('');
}

function deobfuscateKey(obfuscated) {
  return atob(obfuscated.split('').reverse().join(''));
}
```

## 📋 Security Checklist

### Before Testing
- [ ] Using test API keys with limits?
- [ ] Testing on private network?
- [ ] Browser privacy mode enabled?
- [ ] Understanding of data flow?

### During Testing
- [ ] Keys masked in UI?
- [ ] No screenshots with keys visible?
- [ ] Network requests going directly to APIs?
- [ ] Mock agent working for non-API tests?

### After Testing
- [ ] Page refreshed to clear memory?
- [ ] Browser data cleared if needed?
- [ ] API usage reviewed?
- [ ] Test keys rotated if compromised?

## 🎓 Security Education

### For Users
- Browser-based tools have inherent security trade-offs
- Convenience vs Security spectrum
- When to use mock vs real agents
- How to implement secure proxies

### For Developers
- Client-side security limitations
- Server-side proxy patterns
- API key management best practices
- Monitoring and alerting strategies

---

**Remember**: This tool is designed for development and testing. For production AI agent monitoring, implement proper server-side security measures.