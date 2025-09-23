import TemplatesEnum from './templates.enum';

export interface IGetHtmlFromTemplateParams {
	relativePath: TemplatesEnum.RelativePath;
	data: any;
	compileOptions?: CompileOptions;
}
