from pathlib import Path
import yaml
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser


PROMPT_PATH = (
    Path(__file__).parent.parent.parent
    / "prompts"
    / "code_generator.yaml"
)


class CodeGenerator:

    def __init__(self, llm):
        self.llm = llm
        self.chain = self._create_chain()

    def _create_chain(self):
        prompt_data = PROMPT_PATH.read_text(encoding='utf-8')
        import yaml
        prompt_config = yaml.safe_load(prompt_data)
        prompt = PromptTemplate(
            template=prompt_config['template'],
            input_variables=prompt_config['input_variables']
        )
        return prompt | self.llm | JsonOutputParser()

    async def generate(self, post_text: str) -> dict:
        try:
            result = await self.chain.ainvoke({
                "post": post_text
            })
            return result
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise