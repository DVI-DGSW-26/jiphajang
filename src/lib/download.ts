/** 브라우저에서 파일을 내려받게 해요. 서버를 거치지 않아요 */
export function downloadFile(bytes: Uint8Array, fileName: string, type: string): void {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // 바로 지우면 일부 브라우저에서 내려받기가 끊겨요
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 파일 이름에 못 쓰는 글자를 빼요 (Windows 기준) */
export function safeFileName(name: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: 제어 문자를 지우려는 것
  return name.replace(/[/:*?"<>|\u0000-\u001f]/g, ' ').trim();
}
