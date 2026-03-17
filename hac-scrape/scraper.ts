import * as cheerio from 'cheerio';

export async function scrapeHAC(url: string, username: string, password: string) {
  const baseUrl = new URL(url).origin;
  const loginUrl = `${baseUrl}/HomeAccess/Account/LogOn`;
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  };

  const getCookies = (res: Response) => (res.headers.getSetCookie?.() || []).map(c => c.split(';')[0]).join('; ') || res.headers.get('set-cookie') || '';

  // 1. Get verification token
  const initialResponse = await fetch(loginUrl, { headers });
  const initialHtml = await initialResponse.text();
  const verificationToken = cheerio.load(initialHtml)('input[name="__RequestVerificationToken"]').val();
  const initialCookies = getCookies(initialResponse);

  // 2. Login
  const loginData = new URLSearchParams({
    'Database': '10',
    'LogOnDetails.UserName': username,
    'LogOnDetails.Password': password,
    ...(verificationToken ? { '__RequestVerificationToken': verificationToken as string } : {})
  });

  const loginResponse = await fetch(loginUrl, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': initialCookies },
    body: loginData.toString(),
    redirect: 'manual',
  });

  const combinedCookies = [initialCookies, getCookies(loginResponse)].filter(Boolean).join('; ');

  // 3. Get Teacher Names
  const homeResponse = await fetch(`${baseUrl}/HomeAccess/Home/HomeOverview`, { headers: { ...headers, 'Cookie': combinedCookies } });
  const homeHtml = await homeResponse.text();
  
  if (homeHtml.includes('LogOnDetails_UserName') || homeHtml.includes('Invalid user name or password')) {
    throw new Error('Authentication failed.');
  }

  const $home = cheerio.load(homeHtml);
  const courseTeacherMap: Record<string, string> = {};
  
  $home('.sg-5px-margin').each((_, el) => {
    const courseName = $home(el).find('#courseName').text().trim();
    const courseCode = $home(el).find('div span').first().text().replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
    const teacherName = $home(el).find('#staffName').text().trim();
    
    if (teacherName) {
      if (courseCode) courseTeacherMap[courseCode] = teacherName;
      if (courseName) courseTeacherMap[courseName] = teacherName;
    }
  });

  // 4. Get Assignments
  const dataResponse = await fetch(`${baseUrl}/HomeAccess/Content/Student/Assignments.aspx`, { headers: { ...headers, 'Cookie': combinedCookies } });
  const $ = cheerio.load(await dataResponse.text());

  // 5. Parse Data
  const studentName = $('#plnMain_lblStudentName').text().trim() || 'Student';
  const classes: any[] = [];

  $('.AssignmentClass').each((_, el) => {
    const header = $(el).find('.sg-header');
    const className = header.find('.sg-header-heading').first().text().trim();
    const normalizedClassName = className.replace(/\s+/g, ' ');
    const lastUpdated = header.find('.sg-header-sub-heading').text().trim().replace(/[()]/g, '');
    const averageGrade = header.find('.sg-header-heading.sg-right').text().trim();

    let teacherName = 'Unknown';
    const lowerClassName = normalizedClassName.toLowerCase();
    for (const key in courseTeacherMap) {
      if (lowerClassName.includes(key.toLowerCase())) {
        teacherName = courseTeacherMap[key];
        break;
      }
    }

    const assignments: any[] = [];
    $(el).find('table.sg-asp-table .sg-asp-table-data-row').each((__, row) => {
      const cols = $(row).find('td');
      assignments.push({
        dateDue: cols.eq(0).text().trim(),
        name: cols.eq(2).text().trim(),
        category: cols.eq(3).text().trim(),
        score: cols.eq(4).text().trim(),
        totalPoints: cols.eq(5).text().trim(),
      });
    });

    classes.push({ name: className, teacher: teacherName, grade: averageGrade, lastUpdated, assignments });
  });

  if (classes.length === 0) {
    throw new Error('No classes found.');
  }

  return { studentName, classes };
}
