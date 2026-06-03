import sys
sys.path.append('.')
try:
    from agent import _build_root_agent
    agent = _build_root_agent()
    print("Agent build SUCCESS:", agent.name)
except Exception as e:
    import traceback
    print("Agent build FAILED:")
    traceback.print_exc()
