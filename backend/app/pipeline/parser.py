"""Modular Log Parsing Engine for NoBugs AI (Milestone 1)"""
import re
import json
import datetime
from typing import List, Dict, Any, Optional, Tuple
from app.pipeline.redactor import redactor

# Common timestamp patterns
ISO_TIMESTAMP_REGEX = re.compile(
    r"\b(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\b"
)
SYSLOG_TIMESTAMP_REGEX = re.compile(
    r"\b([A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\b"
)
HTTP_TIMESTAMP_REGEX = re.compile(
    r"\[(\d{2}/[A-Z][a-z]{2}/\d{4}:\d{2}:\d{2}:\d{2}\s+[+-]\d{4})\]"
)

# Log level pattern
LOG_LEVEL_REGEX = re.compile(
    r"\b(CRITICAL|FATAL|SEVERE|ERROR|ERR|WARN|WARNING|INFO|DEBUG|TRACE)\b",
    re.IGNORECASE,
)

# Trace and Request ID patterns
TRACE_ID_REGEX = re.compile(
    r"(?i)\b(?:trace_?id|traceId|request_?id|req_?id|correlation_?id|span_?id)\s*[:=]\s*[\"']?([A-Za-z0-9_-]{6,64})[\"']?"
)
BRACKETED_ID_REGEX = re.compile(r"\[([a-f0-9]{8,32}|[a-f0-9-]{36})\]")

# Component / Service pattern
COMPONENT_BRACKET_REGEX = re.compile(r"\[([a-zA-Z0-9_\-\.]{3,30})\]")
COMPONENT_KEY_REGEX = re.compile(r"(?i)\b(?:service|svc|app|component|logger)\s*[:=]\s*[\"']?([a-zA-Z0-9_\-\.]{3,40})[\"']?")

# Stack trace indicators
STACK_TRACE_START_REGEX = re.compile(
    r"^(?:Traceback \(most recent call last\):|.*Exception.*:|.*Error.*:|\tat |\s+at [a-zA-Z0-9_\.\$]+\([a-zA-Z0-9_\.\s]+:\d+\))"
)


class ParsedEventDraft:
    def __init__(
        self,
        line_number: int,
        raw_line: str,
        timestamp: Optional[datetime.datetime] = None,
        log_level: str = "INFO",
        component: Optional[str] = None,
        message: str = "",
        stack_trace: Optional[str] = None,
        trace_id: Optional[str] = None,
        request_id: Optional[str] = None,
        is_error: bool = False,
        error_type: Optional[str] = None,
        is_malformed: bool = False,
    ):
        self.line_number = line_number
        self.raw_line = raw_line
        self.timestamp = timestamp
        self.log_level = log_level
        self.component = component
        self.message = message
        self.stack_trace = stack_trace
        self.trace_id = trace_id
        self.request_id = request_id
        self.is_error = is_error
        self.error_type = error_type
        self.is_malformed = is_malformed


class LogParser:
    """Parses raw log text into structured, sanitized event records"""

    def parse_timestamp(self, text: str) -> Optional[datetime.datetime]:
        """Attempt to parse timestamps across common engineering formats"""
        # 1. ISO 8601
        iso_match = ISO_TIMESTAMP_REGEX.search(text)
        if iso_match:
            val = iso_match.group(1).replace(" ", "T")
            try:
                # Handle trailing Z
                if val.endswith("Z"):
                    val = val[:-1] + "+00:00"
                return datetime.datetime.fromisoformat(val)
            except Exception:
                pass

        # 2. HTTP access log format: 14/Oct/2026:10:05:22 +0000
        http_match = HTTP_TIMESTAMP_REGEX.search(text)
        if http_match:
            try:
                return datetime.datetime.strptime(http_match.group(1), "%d/%b/%Y:%H:%M:%S %z")
            except Exception:
                pass

        # 3. Syslog format: Oct 14 10:05:22
        syslog_match = SYSLOG_TIMESTAMP_REGEX.search(text)
        if syslog_match:
            try:
                # Use current year for syslog missing year
                current_year = datetime.datetime.now(datetime.timezone.utc).year
                dt_str = f"{syslog_match.group(1)} {current_year}"
                parsed = datetime.datetime.strptime(dt_str, "%b %d %H:%M:%S %Y")
                return parsed.replace(tzinfo=datetime.timezone.utc)
            except Exception:
                pass

        return None

    def normalize_level(self, raw_level: Optional[str]) -> str:
        """Map variations to standard uppercase levels"""
        if not raw_level:
            return "INFO"
        lvl = raw_level.strip().upper()
        if lvl in ("CRITICAL", "FATAL", "SEVERE"):
            return "CRITICAL"
        if lvl in ("ERROR", "ERR"):
            return "ERROR"
        if lvl in ("WARN", "WARNING"):
            return "WARN"
        if lvl in ("DEBUG", "TRACE"):
            return "DEBUG"
        return "INFO"

    def parse_json_line(self, line: str, line_number: int) -> Optional[ParsedEventDraft]:
        """Attempt to parse a structured JSON log line"""
        stripped = line.strip()
        if not (stripped.startswith("{") and stripped.endswith("}")):
            return None
        try:
            data = json.loads(stripped)
            if not isinstance(data, dict):
                return None

            # Extract timestamp
            ts = None
            for key in ("timestamp", "time", "@timestamp", "date", "ts"):
                if key in data and data[key]:
                    ts = self.parse_timestamp(str(data[key]))
                    if ts:
                        break

            # Extract level
            raw_lvl = None
            for key in ("level", "log_level", "severity", "status"):
                if key in data and data[key]:
                    raw_lvl = str(data[key])
                    break
            level = self.normalize_level(raw_lvl)

            # Extract message
            message = ""
            for key in ("message", "msg", "log", "text", "error", "description"):
                if key in data and data[key]:
                    message = str(data[key])
                    break
            if not message:
                message = json.dumps(data)

            # Extract trace / request IDs
            trace_id = str(data.get("trace_id") or data.get("traceId") or data.get("trace") or "") or None
            request_id = str(data.get("request_id") or data.get("requestId") or data.get("req_id") or "") or None

            # Extract component
            component = str(data.get("service") or data.get("component") or data.get("app") or data.get("logger") or "") or None

            # Stack trace
            stack_trace = str(data.get("stack_trace") or data.get("stacktrace") or data.get("traceback") or "") or None

            is_err = level in ("ERROR", "CRITICAL") or bool(stack_trace) or "error" in message.lower()
            err_type = str(data.get("error_type") or data.get("exception") or "") or None

            return ParsedEventDraft(
                line_number=line_number,
                raw_line=line,
                timestamp=ts,
                log_level=level,
                component=component,
                message=message,
                stack_trace=stack_trace,
                trace_id=trace_id,
                request_id=request_id,
                is_error=is_err,
                error_type=err_type,
                is_malformed=False,
            )
        except json.JSONDecodeError:
            return None

    def parse_text_line(self, line: str, line_number: int) -> ParsedEventDraft:
        """Parse unstructured or semi-structured log line"""
        # Timestamp
        ts = self.parse_timestamp(line)

        # Log Level
        level_match = LOG_LEVEL_REGEX.search(line)
        raw_lvl = level_match.group(1) if level_match else "INFO"
        level = self.normalize_level(raw_lvl)

        # Trace / Request ID
        trace_id = None
        trace_match = TRACE_ID_REGEX.search(line)
        if trace_match:
            trace_id = trace_match.group(1)
        else:
            bracket_match = BRACKETED_ID_REGEX.search(line)
            if bracket_match:
                trace_id = bracket_match.group(1)

        # Request ID
        req_match = re.search(r"(?i)\b(?:req_?id|request_?id)\s*[:=]\s*([a-zA-Z0-9_-]+)", line)
        request_id = req_match.group(1) if req_match else None

        # Component
        component = None
        comp_key_match = COMPONENT_KEY_REGEX.search(line)
        if comp_key_match:
            component = comp_key_match.group(1)
        else:
            comp_matches = COMPONENT_BRACKET_REGEX.findall(line)
            for m in comp_matches:
                # filter out levels or numbers
                if m.upper() not in ("INFO", "ERROR", "WARN", "DEBUG", "CRITICAL") and not m.isdigit():
                    component = m
                    break

        # Error flag
        is_err = level in ("ERROR", "CRITICAL") or any(
            w in line.lower() for w in ("exception", "failed", "timeout", "exhausted", "crash", "panic")
        )

        return ParsedEventDraft(
            line_number=line_number,
            raw_line=line,
            timestamp=ts,
            log_level=level,
            component=component,
            message=line.strip(),
            stack_trace=None,
            trace_id=trace_id,
            request_id=request_id,
            is_error=is_err,
            error_type=None,
            is_malformed=False,
        )

    def parse_log_content(
        self,
        content: str,
        filename: str = "upload.log",
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Parses multi-line content into aggregated events.
        Groups consecutive stack trace lines into the initiating event.
        Redacts sensitive data.
        
        Returns:
            Tuple of:
            - list of parsed event dicts
            - metadata stats summary (time ranges, redactions, errors)
        """
        lines = content.splitlines()
        parsed_events: List[ParsedEventDraft] = []
        processing_errors: List[str] = []
        total_redactions = 0
        all_redaction_samples: List[Dict[str, Any]] = []

        current_event: Optional[ParsedEventDraft] = None

        for idx, raw_line in enumerate(lines, start=1):
            stripped = raw_line.strip()
            if not stripped:
                continue

            # Redact secrets on each line immediately
            sanitized_line, red_cnt, detections = redactor.redact(raw_line, line_number=idx)
            if red_cnt > 0:
                total_redactions += red_cnt
                all_redaction_samples.extend(detections)

            # Check if this line is a continuation line or stack trace
            has_timestamp = self.parse_timestamp(sanitized_line) is not None
            is_indented = raw_line.startswith((" ", "\t"))
            is_trace_marker = (
                stripped.startswith(("Traceback", 'File "', "at ", "Caused by:", "..."))
                or "Exception" in stripped
                or "Error:" in stripped
            )

            # If current event exists and this line lacks a timestamp:
            if current_event is not None and not has_timestamp:
                # If we're already tracking a stack trace or this line indicates traceback/indentation:
                if current_event.stack_trace is not None or is_trace_marker or (current_event.is_error and is_indented):
                    if current_event.stack_trace:
                        current_event.stack_trace += "\n" + sanitized_line
                    else:
                        current_event.stack_trace = sanitized_line
                    current_event.is_error = True
                    continue
                elif is_indented:
                    # Message continuation (e.g. multi-line SQL or dump)
                    current_event.message += "\n" + sanitized_line
                    continue

            # Try parsing JSON line
            json_draft = self.parse_json_line(sanitized_line, idx)
            if json_draft:
                if current_event:
                    parsed_events.append(current_event)
                current_event = json_draft
                continue

            # Parse standard text line
            text_draft = self.parse_text_line(sanitized_line, idx)
            if current_event:
                parsed_events.append(current_event)
            current_event = text_draft

        if current_event:
            parsed_events.append(current_event)

        # Compute time range and summary metrics
        timestamps = [e.timestamp for e in parsed_events if e.timestamp is not None]
        time_start = min(timestamps) if timestamps else None
        time_end = max(timestamps) if timestamps else None

        error_count = sum(1 for e in parsed_events if e.is_error)

        events_dicts = []
        for e in parsed_events:
            events_dicts.append({
                "original_line_number": e.line_number,
                "timestamp": e.timestamp,
                "log_level": e.log_level,
                "component": e.component,
                "message": e.message,
                "stack_trace": e.stack_trace,
                "trace_id": e.trace_id,
                "request_id": e.request_id,
                "is_error": e.is_error,
                "error_type": e.error_type,
                "is_malformed": e.is_malformed,
            })

        summary = {
            "filename": filename,
            "total_lines": len(lines),
            "parsed_events_count": len(events_dicts),
            "error_events_count": error_count,
            "time_range_start": time_start,
            "time_range_end": time_end,
            "processing_errors": processing_errors,
            "redaction_count": total_redactions,
            "redaction_samples": all_redaction_samples[:20],
        }

        return events_dicts, summary


log_parser = LogParser()
